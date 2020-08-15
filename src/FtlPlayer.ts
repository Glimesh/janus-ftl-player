import { Janus, PluginHandle, Message, JSEP } from "janus-gateway";

export class FtlPlayer {
    private static readonly janusPluginPackage = "janus.plugin.ftl";
    static isJanusInitialized: boolean = false;
    private janusInstance: (Janus | null) = null;
    private serverUri: string;
    private janusPluginHandle: (PluginHandle | null) = null;

    constructor(serverUri: (string | null) = null) {
        if (serverUri)
        {
            this.serverUri = serverUri;
        }
        else
        {
            // Assume we're connecting to the same machine
            if(window.location.protocol === 'http:')
            {
                this.serverUri = "http://" + window.location.hostname + ":8088/janus";
            }
            else
            {
                this.serverUri = "https://" + window.location.hostname + ":8089/janus";
            }
        }
    }

    public async init(): Promise<void> {
        return new Promise<void>(async (resolve: () => void, reject: () => void) => {
            // Init Janus if it isn't already
            await FtlPlayer.initJanus();

            // Create Janus session
            this.janusInstance = await FtlPlayer.createJanusInstance(this.serverUri); // TODO: Catch connection error

            // Attach to FTL plugin
            this.janusPluginHandle = await this.attachToFtlPlugin();
            console.log("Attached to plugin!");
        });
    }

    private static async initJanus(): Promise<void> {
        return new Promise<void>(async (resolve: () => void, reject: () => void) => {
            if (!FtlPlayer.isJanusInitialized) {
                Janus.init({
                    debug: "all",
                    callback: () => {
                        FtlPlayer.isJanusInitialized = true;
                        console.log("Janus is initialized!");
                        resolve();
                    }
                });
            }
            else
            {
                resolve();
            }
        });
    }

    private static async createJanusInstance(serverUri: string): Promise<Janus> {
        return new Promise<Janus>(async (resolve: (result: Janus) => void, reject: () => void) => {
            let janusInstance = new Janus({
                server: serverUri,
                success: () => {
                    resolve(janusInstance);
                },
                error: () => {
                    reject();
                },
                destroyed: () => {
                    // TODO
                }
            });
        });
    }

    private async attachToFtlPlugin(): Promise<PluginHandle> {
        return new Promise<PluginHandle>(
            async (resolve: (result: PluginHandle) => void, reject: (error: string) => void) => {
                if (this.janusInstance === null)
                {
                    reject("No Janus instance!");
                }
                else
                {
                    this.janusInstance.attach({
                        plugin: FtlPlayer.janusPluginPackage,
                        //TODO: opaqueId: 
                        success: (pluginHandle: PluginHandle) => {
                            resolve(pluginHandle);
                        },
                        error: (error: string) => {
                            reject(error);
                        },
                        consentDialog: this.onJanusConsentDialog,
                        webrtcState: this.onJanusWebRtcState,
                        iceState: this.onJanusIceState,
                        mediaState: this.onJanusMediaState,
                        slowLink: this.onJanusSlowLink,
                        onmessage: this.onJanusMessage,
                        onlocalstream: this.onJanusLocalStream,
                        onremotestream: this.onJanusRemoteStream,
                        ondataopen: this.onJanusDataOpen,
                        ondata: this.onJanusData,
                        oncleanup: this.onJanusCleanup,
                        detached: this.onJanusDetached
                    });
                }
            });
    }

    private onJanusConsentDialog(on: boolean): void {
        console.log("Janus consent dialog " + on);
    }

    private onJanusWebRtcState(isConnected: boolean): void {
        console.log("Janus WebRTC state: " + isConnected);
    }

    private onJanusIceState(state: 'connected' | 'failed'): void {
        console.log("Janus ICE state: " + state);
    }

    private onJanusMediaState(state: { type: 'audio' | 'video'; on: boolean }): void {
        console.log("Janus media state: " + state.type + " = " + state.on);
    }

    private onJanusSlowLink(state: { uplink: boolean }): void {
        console.log("Janus slow link: " + state.uplink);
    }

    private onJanusMessage(message: Message, jsep?: JSEP): void {
        console.log("Janus message: ");
        console.log(JSON.stringify(message));
        if (jsep)
        {
            console.log("JSEP: ");
            console.log(jsep);
        }
    }

    private onJanusLocalStream(stream: MediaStream): void {
        console.log("Janus local stream");
    }

    private onJanusRemoteStream(stream: MediaStream): void {
        console.log("Janus remote stream");
    }

    private onJanusDataOpen(): void {
        console.log("Janus data open");
    }

    private onJanusData(data: string): void {
        console.log("Janus data: " + data);
    }

    private onJanusCleanup(): void {
        console.log("Janus cleanup");
    }

    private onJanusDetached(): void {
        console.log("Janus detached.");
    }
}