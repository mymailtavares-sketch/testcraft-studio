import express from "express";
import {createDemoApp} from "./app.js";
export function createHostedApp(distDirectory:string){
 const app=createDemoApp();
 app.use(express.static(distDirectory,{index:"index.html",dotfiles:"deny"}));
 return app;
}
