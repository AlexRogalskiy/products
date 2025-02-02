import React from 'react'

const H1: React.FC<any> = ({className = '', children, ...props}) => {
  return (
    <h1 className={className} {...props}>
      {children}
    </h1>
  )
}
const H2: React.FC<any> = ({className = '', children, ...props}) => {
  return (
    <h2 className={className} {...props}>
      {children}
    </h2>
  )
}
const H3: React.FC<any> = ({className = '', children, ...props}) => {
  return (
    <h3 className={className} {...props}>
      {children}
    </h3>
  )
}
const H4: React.FC<any> = ({className = '', children, ...props}) => {
  return (
    <h4 className={className} {...props}>
      {children}
    </h4>
  )
}

export {H1, H2, H3, H4}
