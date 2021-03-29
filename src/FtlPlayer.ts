import { Janus, PluginHandle, Message, JSEP } from "janus-gateway-mirror";

type Options = {
    debug?: boolean,
    hideTimelineControl?: boolean,
    hooks?: {
        janusSlowLink?: (uplink: boolean, lost: number) => void;
    }
}

export class FtlPlayer {
    private static readonly janusPluginPackage = "janus.plugin.ftl";
    private readonly logPrefix = "janus-ftl-player:";
    private element: HTMLVideoElement;
    private serverUri: string;
    static isJanusInitialized: boolean = false;
    private janusInstance: (Janus | null) = null;
    private janusPluginHandle: (PluginHandle | null) = null;
    private options: Options;

    constructor(element: HTMLVideoElement, serverUri: (string | null) = null, options: Options = {}) {
        // Allow configuring additional options
        this.options = {
            debug: true,
            hideTimelineControl: true
        };
        Object.assign(this.options, options);

        this.element = element;

        if (this.options.hideTimelineControl) {
            let uniqueClass = "janus-ftl-player-" + Math.floor(Math.random() * 10000)
            this.element.classList.add(uniqueClass);

            let videoStyle = document.createElement("style");
            videoStyle.appendChild(document.createTextNode(`
            .${uniqueClass}::-webkit-media-controls-timeline {
                display: none;
            }
            `));
            document.head.appendChild(videoStyle);
        }

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

    private debug(...messages: any[]): void {
        if (this.options.debug) {
            console.debug(this.logPrefix, ...messages)
        }
    }

    public async init(channelId: number): Promise<void> {
        return new Promise<void>(async (resolve: () => void, reject: () => void) => {
            // Init Janus if it isn't already
            await this.initJanus();

            // Create Janus session
            this.janusInstance = await FtlPlayer.createJanusInstance(this.serverUri); // TODO: Catch connection error

            // Attach to FTL plugin
            this.janusPluginHandle = await this.attachToFtlPlugin();
            this.debug("Attached to plugin!");

            // Watch a hard-coded channel id
            this.watchChannel(channelId);
        });
    }

    public async destroy(): Promise<void> {
        return new Promise<void>(async (resolve: () => void, reject: () => void) => {
            if (FtlPlayer.isJanusInitialized) {
                this.janusInstance?.destroy();
            }
            resolve();
        });
    }

    private async initJanus(): Promise<void> {
        return new Promise<void>(async (resolve: () => void, reject: () => void) => {
            if (!FtlPlayer.isJanusInitialized) {
                Janus.init({
                    debug: this.options.debug,
                    callback: () => {
                        FtlPlayer.isJanusInitialized = true;
                        this.debug("Janus is initialized!");
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
        this.debug("Janus consent dialog " + on);
    }

    private onJanusWebRtcState(isConnected: boolean): void {
        this.debug("Janus WebRTC state: " + isConnected);
    }

    private onJanusIceState(state: 'connected' | 'failed'): void {
        this.debug("Janus ICE state: " + state);
    }

    private onJanusMediaState(state: { type: 'audio' | 'video'; on: boolean }): void {
        this.debug("Janus media state: " + state.type + " = " + state.on);
    }

    /*
     * slowLink: this callback is triggered when Janus reports trouble either sending or receiving media on 
     * the specified PeerConnection, typically as a consequence of too many NACKs received from/sent to the 
     * user in the last second: 
     *   for instance, a slowLink with uplink=true means you notified several missing packets from Janus, 
     *   while uplink=false means Janus is not receiving all your packets; 
     *   useful to figure out when there are problems on the media path (e.g., excessive loss), 
     *   in order to possibly react accordingly (e.g., decrease the bitrate if most of our packets are getting lost);
    */
    private onJanusSlowLink(uplink: boolean, lost: number): void {
        this.debug(`Janus slow link: uplink=${uplink} lost=${lost}`);
        if (this.options.hooks?.janusSlowLink) {
            this.options.hooks.janusSlowLink(uplink, lost);
        }
    }

    private onJanusMessage(message: Message, jsep?: JSEP): void {
        this.debug("Janus message: ", JSON.stringify(message));
        if (jsep) {
            this.debug("JSEP:", jsep);
            this.handleJsep(jsep)
                .then((jsep: JSEP) => {
                    this.debug("Got jsep back!");
                    this.debug(jsep);
                    var body = { request: "start" };
                    this.janusPluginHandle?.send({ message: body, jsep: jsep });
                })
                .catch((error: Error) => {
                    this.debug("Error handling jsep: " + error);
                });
        }
    }

    private onJanusLocalStream(stream: MediaStream): void {
        this.debug("Janus local stream");
    }

    private onJanusRemoteStream(stream: MediaStream): void {
        this.debug("Janus remote stream");
        Janus.attachMediaStream(this.element, stream);
    }

    private onJanusDataOpen(): void {
        this.debug("Janus data open");
    }

    private onJanusData(data: string): void {
        this.debug("Janus data: " + data);
    }

    private onJanusCleanup(): void {
        this.debug("Janus cleanup");
    }

    private onJanusDetached(): void {
        this.debug("Janus detached.");
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
