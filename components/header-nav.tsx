"use client"

import type React from "react"

interface HeaderNavProps {
  showButtonOnly?: boolean
  onSuccess?: () => void
}

const HeaderNav: React.FC<HeaderNavProps> = ({ showButtonOnly = false, onSuccess = () => {} }) => {
  const handleSuccess = () => {
    onSuccess?.()
    // Any other success handling
  }

  if (showButtonOnly) {
    return <button onClick={handleSuccess}>Success Button</button>
  }

  return (
    <nav>
      <ul>
        <li>
          <a href="#">Home</a>
        </li>
        <li>
          <a href="#">About</a>
        </li>
        <li>
          <a href="#">Services</a>
        </li>
        <li>
          <a href="#">Contact</a>
        </li>
        <li>
          <button onClick={handleSuccess}>Success Button</button>
        </li>
      </ul>
    </nav>
  )
}

export default HeaderNav
