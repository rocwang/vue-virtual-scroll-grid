import { createApp } from "vue";
import App from "./App.vue";
import Bem from "./Bem";

const app = createApp(App);
app.mixin(Bem);
app.mount(document.body);
