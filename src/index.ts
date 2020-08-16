import { FtlPlayer } from './FtlPlayer';

window.addEventListener("load", () => {
    let player = new FtlPlayer(document.querySelector("video") as HTMLVideoElement);
    player.init();
});