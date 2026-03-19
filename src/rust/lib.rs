use napi::bindgen_prelude::*;
use napi_derive::napi;
use rayon::prelude::*;
use std::sync::{Arc, Mutex};

/// Async multi-threaded BGRA → I420AP10 converter.
///
/// Output layout — each sample is a u16 stored little-endian:
///   Y : [0,             w*h)           luma
///   U : [w*h,           w*h + uw*uh)   Cb (4:2:0 sub-sampled)
///   V : [w*h + uw*uh,   w*h + 2*uw*uh) Cr (4:2:0 sub-sampled)
///   A : [w*h + 2*uw*uh, 2*w*h + 2*uw*uh) alpha
///
/// Color: BT.601 limited range, 10-bit (values in [64, 940] for luma, [64, 960] for chroma).
///
/// Design mirrors FixedBufferWriter:
///   - Pre-allocated input copy buffer pool — avoids per-frame heap allocation
///   - convert() offloads to rayon thread pool, returning a Promise so the
///     Node.js event loop is never blocked
///   - Rayon splits the image into horizontal row-pair bands processed in parallel;
///     the inner Y/A loop is structured for LLVM auto-vectorisation (NEON / SSE2+)
#[napi]
pub struct BgraConverter {
    width: usize,
    height: usize,
    out_size: usize,
    pool: Arc<Mutex<Vec<Vec<u8>>>>,
}

#[napi]
impl BgraConverter {
    #[napi(constructor)]
    pub fn new(width: u32, height: u32) -> Self {
        let (w, h) = (width as usize, height as usize);
        let (uw, uh) = ((w + 1) / 2, (h + 1) / 2);
        // Y + U + V + A, each sample = 2 bytes (u16 LE)
        let out_size = (w * h + uw * uh * 2 + w * h) * 2;
        let in_size = w * h * 4;
        // Double-buffer: one in-flight, one available for the next frame
        let pool = Arc::new(Mutex::new(vec![
            Vec::with_capacity(in_size),
            Vec::with_capacity(in_size),
        ]));
        BgraConverter { width: w, height: h, out_size, pool }
    }

    #[napi]
    pub async fn convert(&self, bgra: Buffer) -> Buffer {
        let (w, h, out_size) = (self.width, self.height, self.out_size);
        let pool = Arc::clone(&self.pool);

        // Grab a recycled input buffer (or allocate if the pool is empty)
        let mut src = pool.lock().unwrap().pop().unwrap_or_else(|| Vec::with_capacity(w * h * 4));
        src.clear();
        src.extend_from_slice(bgra.as_ref());

        napi::tokio::task::spawn_blocking(move || {
            let out = convert_parallel(&src, w, h, out_size);
            // Return the input buffer to the pool for reuse
            src.clear();
            pool.lock().unwrap().push(src);
            out
        })
        .await
        .expect("BgraConverter: conversion thread panicked")
        .into()
    }
}

fn convert_parallel(src: &[u8], w: usize, h: usize, out_size: usize) -> Vec<u8> {
    let uw = (w + 1) / 2;

    // Allocate output as u16 for clean plane arithmetic; reinterpret as u8 at the end.
    let mut out: Vec<u16> = vec![0u16; out_size / 2];

    // Plane offsets in u16 units
    let y_off = 0;
    let u_off = w * h;
    let v_off = u_off + uw * ((h + 1) / 2);
    let a_off = v_off + uw * ((h + 1) / 2);

    // SAFETY: each row-pair writes to strictly non-overlapping regions of `out`:
    //   row-pair rp owns Y[rp*2*w .. (rp*2+2)*w], A[same], U[rp*uw .. (rp+1)*uw], V[same].
    // Rayon guarantees no two iterations share a row-pair, so all writes are disjoint.
    // Cast to usize so the value is Send+Sync; the raw pointer is reconstructed inside each closure.
    let out_addr = out.as_mut_ptr() as usize;

    (0..(h + 1) / 2).into_par_iter().for_each(|rp| {
        let row0 = rp * 2;
        let row1 = row0 + 1;

        unsafe {
            let ptr = out_addr as *mut u16;
            // --- Y and A planes (one pass per row to maximise cache reuse) ---
            let rows = if row1 < h { &[row0, row1][..] } else { &[row0][..] };
            for &row in rows {
                let src_row = src.as_ptr().add(row * w * 4);
                let y_row = ptr.add(y_off + row * w);
                let a_row = ptr.add(a_off + row * w);

                // Inner loop: simple stride-4 gather + linear combination.
                // With opt-level=3, LLVM vectorises this to NEON (AArch64) or SSE2+ (x86-64).
                for col in 0..w {
                    let p = src_row.add(col * 4);
                    let (b, g, r, a) = (*p as i32, *p.add(1) as i32, *p.add(2) as i32, *p.add(3) as i32);
                    *y_row.add(col) = ((((66 * r + 129 * g + 25 * b + 128) >> 8) + 16) << 2).clamp(64, 940) as u16;
                    *a_row.add(col) = (a << 2).min(1023) as u16;
                }
            }

            // --- UV planes (one Cb/Cr sample per 2×2 luma block) ---
            let u_row = ptr.add(u_off + rp * uw);
            let v_row = ptr.add(v_off + rp * uw);

            for cp in 0..uw {
                let col0 = cp * 2;
                let col1 = (col0 + 1).min(w - 1);
                let mut sum_b = 0i32;
                let mut sum_g = 0i32;
                let mut sum_r = 0i32;
                let mut count = 0i32;
                for &row in rows {
                    for &col in &[col0, col1] {
                        let i = (row * w + col) * 4;
                        sum_b += src[i] as i32;
                        sum_g += src[i + 1] as i32;
                        sum_r += src[i + 2] as i32;
                        count += 1;
                    }
                }
                let (ab, ag, ar) = (sum_b / count, sum_g / count, sum_r / count);
                *u_row.add(cp) = ((((-38 * ar - 74 * ag + 112 * ab + 128) >> 8) + 128) << 2).clamp(64, 960) as u16;
                *v_row.add(cp) = ((((112 * ar - 94 * ag - 18 * ab + 128) >> 8) + 128) << 2).clamp(64, 960) as u16;
            }
        }
    });

    // Reinterpret Vec<u16> as Vec<u8> without copying (u16 is already LE on all targets)
    let mut out = std::mem::ManuallyDrop::new(out);
    unsafe { Vec::from_raw_parts(out.as_mut_ptr() as *mut u8, out.len() * 2, out.capacity() * 2) }
}
