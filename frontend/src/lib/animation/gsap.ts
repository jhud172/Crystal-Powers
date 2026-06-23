import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let pluginsRegistered = false;

export function registerGsapPlugins(): void {
  if (pluginsRegistered) return;

  gsap.registerPlugin(ScrollTrigger, useGSAP);
  pluginsRegistered = true;
}

registerGsapPlugins();

export { gsap, ScrollTrigger, useGSAP };
