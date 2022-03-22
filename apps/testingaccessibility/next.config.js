const withPlugins = require('next-compose-plugins')
const withImages = require('next-images')
const withMDX = require('@next/mdx')()

const IMAGE_HOST_DOMAINS = [
  `res.cloudinary.com`,
  `d2eip9sf3oo6c2.cloudfront.net`,
  `cdn.sanity.io`,
]

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // 😭
  },
  webpack: (config, {isServer}) => {
    // Fixes npm packages that depend on `fs` module
    if (!isServer) {
      // Till undici 4 haven't landed in prisma, we need this for docker/alpine
      // @see https://github.com/prisma/prisma/issues/6925#issuecomment-905935585
      config.node = {
        fs: 'empty',
      }
    }
    return config
  },
  reactStrictMode: true,
  images: {
    domains: IMAGE_HOST_DOMAINS,
  },
  async redirects() {
    return []
  },
}

module.exports = withPlugins(
  [
    withImages(),
    withMDX({
      options: {
        providerImportSource: '@mdx-js/react',
      },
      pageExtensions: ['ts', 'tsx', 'mdx'],
      rehypePlugins: [require('mdx-prism')],
    }),
  ],
  nextConfig,
)
