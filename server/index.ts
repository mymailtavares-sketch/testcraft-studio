import {createDemoApp} from "./app.js";
createDemoApp().listen(3001,"127.0.0.1",()=>console.log("TestCraft demo API: http://127.0.0.1:3001 — sem ligações externas"));
