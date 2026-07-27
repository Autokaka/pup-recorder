export interface ChromiumOptions {
    disableGpu: boolean;
    disableWebSecurity: boolean;
    ignoreCertificateErrors: boolean;
}
export declare function chromiumOptions({ disableGpu, disableWebSecurity, ignoreCertificateErrors }: ChromiumOptions): Promise<string[]>;
