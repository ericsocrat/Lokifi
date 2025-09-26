import React from 'react'

export default function DataStatus(props: { provider: string; symbol: string; timeframe: string }) {
  return (
    <div className='absolute top-2 right-2 text-xs px-2 py-1 rounded bg-black/50 border border-white/10'>
      <div className='opacity-70'>Data</div>
      <div><span className='opacity-60'>provider:</span> {props.provider}</div>
      <div><span className='opacity-60'>symbol:</span> {props.symbol}</div>
      <div><span className='opacity-60'>tf:</span> {props.timeframe}</div>
    </div>
  )
}
