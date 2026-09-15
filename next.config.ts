import type { NextConfig } from 'next'
const securityHeaders=[
 {key:'X-Content-Type-Options',value:'nosniff'},
 {key:'X-Frame-Options',value:'DENY'},
 {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
 {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
]
const nextConfig:NextConfig={
 reactStrictMode:true,poweredByHeader:false,
 images:{formats:['image/avif','image/webp'],minimumCacheTTL:60,remotePatterns:[
  {protocol:'https',hostname:'hbgiufhgezbkjynwvfsx.supabase.co',pathname:'/storage/v1/object/**'},
  {protocol:'https',hostname:'**'}
 ]},
 async headers(){return[{source:'/:path*',headers:securityHeaders}]}
}
export default nextConfig
