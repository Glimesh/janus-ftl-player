/// <reference path="Janus.d.ts"/>
import { Janus } from 'janus-gateway';

alert("Hello world");

Janus.init({
    debug: "all",
    callback: () => {
        console.log("Janus is ready!");
    }
});