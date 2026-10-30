/* QA-only owned Chromium profile: preserve native visibility instead of focus emulation. */
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const assert=require('node:assert/strict');
const {spawn,spawnSync}=require('node:child_process');
const {chromium}=require(process.env.CRYSTAL_PLAYWRIGHT_MODULE || 'playwright');
exports.openNativeEdge=async()=>{
 const profile=await fs.mkdtemp(path.join(os.tmpdir(),'crystal-native-'));
 assert.equal(path.dirname(path.resolve(profile)),path.resolve(os.tmpdir()));assert.ok(path.basename(profile).startsWith('crystal-native-'));
 const processHandle=spawn(process.env.CRYSTAL_BROWSER_EXECUTABLE || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',[
  '--user-data-dir='+profile,'--remote-debugging-port=0','--remote-debugging-address=127.0.0.1',
  '--no-first-run','--no-default-browser-check','--disable-extensions','--disable-sync',
  '--disable-background-networking','--edge-skip-compat-layer-relaunch','--no-startup-window'
 ],{stdio:'ignore'});
 let browser,spawnError;processHandle.on('error',error=>{spawnError=error;});
 const close=async()=>{
  if(browser){try{await Promise.race([(async()=>{await (await browser.newBrowserCDPSession()).send('Browser.close');})(),new Promise(resolve=>setTimeout(resolve,3000))]);}catch{}await browser.close().catch(()=>{});}
  if(processHandle.exitCode===null){if(process.platform==='win32')spawnSync('taskkill',['/PID',String(processHandle.pid),'/T','/F'],{stdio:'ignore'});else processHandle.kill();}
  // Only this fixture's mkdtemp profile is removed, never the user's browser profile.
  await fs.rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:200}).catch(()=>{});
 };
 try{
  let port;
  for(let attempt=0;attempt<150;attempt++){
   if(spawnError)throw spawnError;
   try{port=(await fs.readFile(path.join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];if(/^\d+$/.test(port))break;}catch{}
   await new Promise(resolve=>setTimeout(resolve,100));
  }
  if(!port)throw new Error('Owned Edge did not expose its loopback debugging port.');
  // noDefaults prevents Playwright's Emulation.setFocusEmulationEnabled override.
  browser=await chromium.connectOverCDP('http://127.0.0.1:'+port,{noDefaults:true,timeout:20000});
  const context=browser.contexts()[0];
  const page=context.pages()[0] || await context.newPage(),session=await context.newCDPSession(page);
  const {windowId}=await session.send('Browser.getWindowForTarget');
  await session.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'normal'}});
  await session.send('Browser.setWindowBounds',{windowId,bounds:{width:1440,height:1000}});
  await session.detach();
  return {browser,context,page,close};
 }catch(error){await close();throw error;}
};
