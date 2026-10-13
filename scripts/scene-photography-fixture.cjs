/* Test-only fixture: imports the actual source renderer/poster, never adds a product route. */
module.exports = async function scenePhotographyFixture(base) {
  if (base !== 'http://127.0.0.1:5175') throw new Error('Use isolated loopback Vite for the read-only scene fixture');
  const compiledCanvas = await (await fetch(base + '/src/features/experience/ModelCanvas.tsx')).text();
  const contextModule = compiledCanvas.match(/from ["']([^"']*ExperienceContext\.tsx[^"']*)["']/)?.[1];
  if (!contextModule?.startsWith('/src/features/experience/ExperienceContext.tsx')) throw new Error('Actual renderer context module not found');
  return `<!doctype html><html><head><meta name="robots" content="noindex,nofollow"><title>LOCAL QA — original scene photography</title><style>html,body,#root{margin:0;width:100%;height:100%;background:transparent;overflow:hidden}#root picture{display:block;width:100%;height:100%}#root img{display:block;width:100%;height:100%;object-fit:contain}</style>
<script type="module">import RefreshRuntime from '/@react-refresh'; RefreshRuntime.injectIntoGlobalHook(window); window.$RefreshReg$=()=>{}; window.$RefreshSig$=()=>type=>type; window.__vite_plugin_react_preamble_installed__=true;</script></head><body><div id="root"></div>
<script type="module">
import React from '/node_modules/.vite/deps/react.js'; import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
import ModelCanvas from '/src/features/experience/ModelCanvas.tsx'; import {ScenePoster} from '/src/features/experience/ScenePoster.tsx';
import {ExperienceProvider} from '${contextModule}'; import {scenePresentation} from '/src/features/experience/scenePresentation.ts';
const {Suspense,createRef}=React; const root=ReactDOM.createRoot(document.getElementById('root')); let generation=0;
window.renderScene=(model,light,pose,mode='live',backdrop='transparent')=>{
  document.documentElement.dataset.ready='false'; document.body.style.background=backdrop;
  const interaction=createRef(); interaction.current={yaw:0,pitch:0,hoverX:0,hoverY:0,palette:0,pulse:0};
  window.sceneFrame={model,light,pose,...scenePresentation(model)};
  const props={model,light,pose,angle:0,reset:0,playing:false,onInteraction:()=>{},onFailure:()=>{document.documentElement.dataset.failed='true'},onFinished:()=>{},onReady:()=>{document.documentElement.dataset.ready='true'}};
  if(model==='observatory') props.interaction=interaction;
  if(['laptop','monitor','phone'].includes(model)) props.image='/renders/'+(model==='phone'?'studio-mobile.png':'studio-screen.png');
  const scene=mode==='poster'?React.createElement(ScenePoster,{model,light,open:pose==='open',alt:'Local original '+model+' photography QA',sizes:'100vw',eager:true}):React.createElement(ModelCanvas,props);
  root.render(React.createElement(ExperienceProvider,{key:++generation,renderQuality:'standard'},React.createElement(Suspense,{fallback:null},scene)));
}; window.fixtureReady=true;
</script></body></html>`;
};
