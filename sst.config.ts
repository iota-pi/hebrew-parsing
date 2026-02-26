/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "hebrew-parsing",
      removal: input.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input.stage),
      home: "aws",
      providers: {
        aws: { region: "ap-southeast-2" },
        cloudflare: {},
      },
    };
  },
  async run() {
    const isProd = $app.stage === "production";
    const domain = isProd ? "hebrew.cross-code.org" : undefined;

    const site = new sst.aws.StaticSite("HebrewParsing", {
      build: {
        command: "yarn build",
        output: "build",
      },
      domain: domain
        ? {
          name: domain,
          dns: sst.cloudflare.dns(),
        }
        : undefined,
      errorPage: "redirect_to_index_page",
    });

    return { url: site.url };
  },
});
