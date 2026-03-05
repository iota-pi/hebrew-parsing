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
    const hebrewDomain = isProd ? "hebrew.cross-code.org" : undefined;
    const aramaicDomain = isProd ? "aramaic.cross-code.org" : undefined;

    const hebrewSite = new sst.aws.StaticSite("HebrewParsing", {
      build: {
        command: "VITE_SITE_TITLE=Hebrew VITE_LANGUAGE=hebrew VITE_OUT_DIR=build-hebrew yarn build",
        output: "build-hebrew",
      },
      domain: hebrewDomain
        ? {
          name: hebrewDomain,
          dns: sst.cloudflare.dns(),
        }
        : undefined,
      errorPage: "redirect_to_index_page",
    });

    const aramaicSite = new sst.aws.StaticSite("AramaicParsing", {
      build: {
        command: "yarn build",
        output: "build-aramaic",
      },
      domain: aramaicDomain
        ? {
          name: aramaicDomain,
          dns: sst.cloudflare.dns(),
        }
        : undefined,
      errorPage: "redirect_to_index_page",
      environment: {
        VITE_SITE_TITLE: "Aramaic",
        VITE_LANGUAGE: "aramaic",
        VITE_OUT_DIR: "build-aramaic",
      },
    });

    return {
      hebrewUrl: hebrewSite.url,
      aramaicUrl: aramaicSite.url,
    };
  },
});
