// Created by Autokaka (qq1909698494@gmail.com) on 2026/02/10.

use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::fs::File;
use std::io::Write;
use std::sync::mpsc::{sync_channel, Receiver, SyncSender};
use std::sync::Mutex;
use std::thread;
use tokio::task;

#[napi]
pub struct FixedBufferWriter {
    state: Mutex<Option<WriterState>>,
    recycle_rx: Mutex<Receiver<Vec<u8>>>,
    buffer_capacity: usize,
}

struct WriterState {
    sender: SyncSender<Vec<u8>>,
    thread_handle: thread::JoinHandle<std::io::Result<()>>,
}

#[napi]
impl FixedBufferWriter {
    #[napi(constructor)]
    pub fn new(path: String, buffer_capacity: u32, queue_depth: Option<u32>) -> Result<Self> {
        let depth = queue_depth.unwrap_or(2) as usize;
        let capacity = buffer_capacity as usize;

        let (data_tx, data_rx) = sync_channel::<Vec<u8>>(depth);
        let (recycle_tx, recycle_rx) = sync_channel::<Vec<u8>>(depth + 1);

        let handle = thread::spawn(move || {
            let mut file = File::create(path)?;

            while let Ok(mut buffer) = data_rx.recv() {
                file.write_all(&buffer)?;
                buffer.clear();
                let _ = recycle_tx.try_send(buffer);
            }

            file.sync_data()?;
            Ok(())
        });

        Ok(FixedBufferWriter {
            state: Mutex::new(Some(WriterState {
                sender: data_tx,
                thread_handle: handle,
            })),
            recycle_rx: Mutex::new(recycle_rx),
            buffer_capacity: capacity,
        })
    }

    #[napi]
    pub fn write(&self, buffer: Buffer) -> Result<()> {
        let sender = {
            let guard = self.state.lock().unwrap();
            if let Some(state) = guard.as_ref() {
                state.sender.clone()
            } else {
                return Ok(());
            }
        };

        let mut vec = {
            let recycle = self.recycle_rx.lock().unwrap();
            recycle
                .try_recv()
                .unwrap_or_else(|_| Vec::with_capacity(self.buffer_capacity))
        };

        vec.extend_from_slice(buffer.as_ref());

        sender
            .send(vec)
            .map_err(|e| Error::from_reason(e.to_string()))?;

        Ok(())
    }

    #[napi]
    pub async fn close(&self) -> Result<()> {
        let state_opt = {
            let mut guard = self.state.lock().unwrap();
            guard.take()
        };

        if let Some(state) = state_opt {
            drop(state.sender);

            let handle = state.thread_handle;
            task::spawn_blocking(move || {
                handle.join().map_err(|_| {
                    std::io::Error::new(std::io::ErrorKind::Other, "Thread panicked")
                })?
            })
            .await
            .map_err(|e| Error::from_reason(e.to_string()))??;
        }
        Ok(())
    }
}
