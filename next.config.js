/** @type {import('next').NextConfig} */
const { i18n } = require('./next-i18next.config')
const nextConfig = {
    reactStrictMode: true,
    swcMinify: true,
    output: 'standalone',
    i18n
};

module.exports = nextConfig;


// Inected Content via Sentry Wizard Below
if(process.env.NODE_ENV === "production") {
    const {withSentryConfig} = require("@sentry/nextjs");

    module.exports = withSentryConfig(
        module.exports,
        {
            // For all available options, see:
            // https://github.com/getsentry/sentry-webpack-plugin#options

            // Suppresses source map uploading logs during build
            silent: true,

            org: "friendly-fire-share",
            project: "javascript-nextjs",
        },
        {
            // For all available options, see:
            // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

            // Upload a larger set of source maps for prettier stack traces (increases build time)
            widenClientFileUpload: true,

            // Transpiles SDK to be compatible with IE11 (increases bundle size)
            transpileClientSDK: true,

            // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers (increases server load)
            tunnelRoute: "/monitoring",

            // Hides source maps from generated client bundles
            hideSourceMaps: true,

            // Automatically tree-shake Sentry logger statements to reduce bundle size
            disableLogger: true,
        }
    );
}