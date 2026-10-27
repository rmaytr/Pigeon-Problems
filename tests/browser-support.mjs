import {chromium as nativeChromium} from '@playwright/test';

// Keep CSS viewport/layout coverage intact while reducing raster work on CPU-only
// hosted runners. CI frame timings are deliberately excluded from benchmarks.
const ci=process.env.CI==='true';
export const chromium={async launch(options={}){
  const browser=await nativeChromium.launch({...options,args:[...(ci?['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']:[]),...(options.args||[])]});
  const newContext=browser.newContext.bind(browser),newPage=browser.newPage.bind(browser);
  const prepare=async context=>{
    if(ci)context.setDefaultNavigationTimeout(60000);
    // The application explicitly supports system fallbacks. Font-service outages
    // must not hold page load open or make functional checks depend on the WAN.
    await context.route(/^https:\/\/fonts\.googleapis\.com\//,route=>route.fulfill({status:200,contentType:'text/css',body:''}));
    return context;
  };
  const contextOptions=options=>({...options,...(ci?{deviceScaleFactor:.25}:{})});
  browser.newContext=async options=>prepare(await newContext(contextOptions(options)));
  browser.newPage=async options=>{const page=await newPage(contextOptions(options));await prepare(page.context());return page;};
  return browser;
}};
