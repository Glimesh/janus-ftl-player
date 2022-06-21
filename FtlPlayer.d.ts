declare type Options = {
    debug?: boolean;
    hideTimelineControl?: boolean;
    hooks?: {
        janusSlowLink?: (uplink: boolean, lost: number) => void;
    };
};
export declare class FtlPlayer {
    private static readonly janusPluginPackage;
    private readonly logPrefix;
    private element;
    private serverUri;
    static isJanusInitialized: boolean;
    private janusInstance;
    private janusPluginHandle;
    private options;
    constructor(element: HTMLVideoElement, serverUri?: (string | null), options?: Options);
    private debug;
    init(channelId: number): Promise<void>;
    destroy(): Promise<void>;
    private initJanus;
    private static createJanusInstance;
    private attachToFtlPlugin;
    private watchChannel;
    private onJanusConsentDialog;
    private onJanusWebRtcState;
    private onJanusIceState;
    private onJanusMediaState;
    private onJanusSlowLink;
    private onJanusMessage;
    private onJanusLocalStream;
    private onJanusRemoteStream;
    private onJanusDataOpen;
    private onJanusData;
    private onJanusCleanup;
    private onJanusDetached;
    private handleJsep;
}
export {};
