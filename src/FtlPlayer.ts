import { Janus, PluginHandle, Message, JSEP } from "janus-gateway";

export class FtlPlayer {
    private static readonly janusPluginPackage = "janus.plugin.ftl";
    private element: HTMLVideoElement;
    private serverUri: string;
    static isJanusInitialized: boolean = false;
    private janusInstance: (Janus | null) = null;
    private janusPluginHandle: (PluginHandle | null) = null;

    constructor(element: HTMLVideoElement, serverUri: (string | null) = null) {
        this.element = element;
        if (serverUri) {
            this.serverUri = serverUri;
        } else {
            // Assume we're connecting to the same machine
            if (window.location.protocol === 'http:') {
                this.serverUri = "http://" + window.location.hostname + ":8088/janus";
            }
            else {
                this.serverUri = "https://" + window.location.hostname + ":8089/janus";
            }
        }
    }

    public async init(channelId: number): Promise<void> {
        return new Promise<void>(async (resolve: () => void, reject: () => void) => {
            // Init Janus if it isn't already
            await FtlPlayer.initJanus();

            // Create Janus session
            this.janusInstance = await FtlPlayer.createJanusInstance(this.serverUri); // TODO: Catch connection error

            // Attach to FTL plugin
            this.janusPluginHandle = await this.attachToFtlPlugin();
            console.log("Attached to plugin!");

            // Watch a hard-coded channel id
            this.watchChannel(channelId);
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
            } else {
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
                if (this.janusInstance === null) {
                    reject("No Janus instance!");
                } else {
                    this.janusInstance.attach({
                        plugin: FtlPlayer.janusPluginPackage,
                        //TODO: opaqueId: 
                        success: (pluginHandle: PluginHandle) => {
                            resolve(pluginHandle);
                        },
                        error: (error: string) => {
                            reject(error);
                        },
                        consentDialog: this.onJanusConsentDialog.bind(this),
                        webrtcState: this.onJanusWebRtcState.bind(this),
                        iceState: this.onJanusIceState.bind(this),
                        mediaState: this.onJanusMediaState.bind(this),
                        slowLink: this.onJanusSlowLink.bind(this),
                        onmessage: this.onJanusMessage.bind(this),
                        onlocalstream: this.onJanusLocalStream.bind(this),
                        onremotestream: this.onJanusRemoteStream.bind(this),
                        ondataopen: this.onJanusDataOpen.bind(this),
                        ondata: this.onJanusData.bind(this),
                        oncleanup: this.onJanusCleanup.bind(this),
                        detached: this.onJanusDetached.bind(this)
                    });
                }
            });
    }

    private watchChannel(channelId: number): void {
        this.janusPluginHandle?.send({
            message: {
                request: "watch",
                channelId: channelId
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
        if (jsep) {
            console.log("JSEP: ");
            console.log(jsep);
            this.handleJsep(jsep)
                .then((jsep: JSEP) => {
                    console.log("Got jsep back!");
                    var body = { request: "start" };
                    this.janusPluginHandle?.send({ message: body, jsep: jsep });
                })
                .catch((error: Error) => {
                    console.log("Error handling jsep: " + error);
                });
        }
    }

    private onJanusLocalStream(stream: MediaStream): void {
        console.log("Janus local stream");
    }

    private onJanusRemoteStream(stream: MediaStream): void {
        console.log("Janus remote stream");
        Janus.attachMediaStream(this.element, stream);
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

    private async handleJsep(jsep: JSEP): Promise<JSEP> {
        return new Promise<JSEP>(
            async (resolve: (jsep: JSEP) => void, reject: (error: Error) => void) => {
                this.janusPluginHandle?.createAnswer({
                    jsep: jsep,
                    media: { audioSend: false, videoSend: false, data: true },
                    success: (jsep: JSEP) => {
                        resolve(jsep);
                    },
                    error: (error: Error) => {
                        reject(error);
                    }
                });
            });
    }
}
