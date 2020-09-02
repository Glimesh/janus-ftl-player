# Janus FTL Player

Simple player for Janus FTL streams

## Features

- Commandeers &lt;video&gt; elements for WebRTC FTL live streaming

## Usage

### NPM
First, you'll need to install the dependency

    $ npm install --save @glimesh/janus-ftl-player

And then you can use it in your modules like so:
```javascript
import { FtlPlayer } from "@glimesh/janus-ftl-player";

let videoContainer = document.querySelector("video");
let janusEndpoint = "http://localhost:8088/janus";
let channelId = 1;

let player = new FtlPlayer(videoContainer, janusEndpoint);
player.init(channelId);
```

### Standalone
Grab the dist/main.js file include it in your project somewhere, then you can use it like so:
```html
<!-- type="module" is important for loading the library -->
<script type="module" src="main.js"></script>
<script>
    let player = new JanusFtlPlayer.FtlPlayer(document.querySelector("video"));
    player.init(1);
</script>
``` 
You can find a working example in `dist/index.html`

## License

Coming soon.