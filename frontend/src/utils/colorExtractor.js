/**
 * Extract dominant color from an image
 * Uses canvas to sample pixels and find the most common color
 */

export function extractDominantColor(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // Try with CORS first, but handle cases where it might not work
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      console.log('[ColorExtractor] Image loaded, extracting color...')
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        // Set canvas size to image size
        canvas.width = img.width
        canvas.height = img.height
        
        // Draw image to canvas
        ctx.drawImage(img, 0, 0)
        
        // Sample pixels (sample every Nth pixel for performance)
        const sampleRate = 10 // Sample every 10th pixel
        const colorCounts = {}
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        
        // Count color frequencies, prioritizing vibrant colors
        for (let i = 0; i < data.length; i += 4 * sampleRate) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const a = data[i + 3]
          
          // Skip transparent pixels
          if (a < 128) continue
          
          // Calculate brightness (luminance)
          const brightness = (r * 0.299 + g * 0.587 + b * 0.114)
          
          // Skip very dark colors (brightness < 30) - they won't show as a glow
          if (brightness < 30) continue
          
          // Quantize colors to reduce noise (group similar colors)
          const quantizedR = Math.floor(r / 32) * 32
          const quantizedG = Math.floor(g / 32) * 32
          const quantizedB = Math.floor(b / 32) * 32
          
          const colorKey = `${quantizedR},${quantizedG},${quantizedB}`
          
          // Weight vibrant colors more heavily
          const saturation = Math.max(r, g, b) - Math.min(r, g, b)
          const weight = 1 + (brightness / 255) * 0.5 + (saturation / 255) * 0.5
          
          colorCounts[colorKey] = (colorCounts[colorKey] || 0) + weight
        }
        
        // Find the most common vibrant color
        let maxCount = 0
        let dominantColor = null
        
        for (const [colorKey, count] of Object.entries(colorCounts)) {
          const [r, g, b] = colorKey.split(',').map(Number)
          const brightness = (r * 0.299 + g * 0.587 + b * 0.114)
          
          // Prefer colors that are bright enough to be visible
          if (brightness >= 50 && count > maxCount) {
            maxCount = count
            dominantColor = colorKey
          }
        }
        
        // If no bright color found, find the brightest color we have
        if (!dominantColor && Object.keys(colorCounts).length > 0) {
          let maxBrightness = 0
          for (const [colorKey] of Object.entries(colorCounts)) {
            const [r, g, b] = colorKey.split(',').map(Number)
            const brightness = (r * 0.299 + g * 0.587 + b * 0.114)
            if (brightness > maxBrightness) {
              maxBrightness = brightness
              dominantColor = colorKey
            }
          }
        }
        
        if (dominantColor) {
          const [r, g, b] = dominantColor.split(',').map(Number)
          const hexColor = `#${[r, g, b].map(x => {
            const hex = x.toString(16)
            return hex.length === 1 ? '0' + hex : hex
          }).join('')}`
          
          console.log('[ColorExtractor] Extracted color:', hexColor)
          resolve(hexColor)
        } else {
          console.warn('[ColorExtractor] No dominant color found')
          reject(new Error('No dominant color found'))
        }
      } catch (error) {
        console.error('Error extracting color:', error)
        reject(error)
      }
    }
    
    img.onerror = (error) => {
      console.error('[ColorExtractor] Error loading image:', imageUrl, error)
      // If CORS fails, try without crossOrigin
      if (img.crossOrigin === 'anonymous') {
        console.log('[ColorExtractor] Retrying without CORS...')
        const img2 = new Image()
        img2.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            canvas.width = img2.width
            canvas.height = img2.height
            ctx.drawImage(img2, 0, 0)
            
            const sampleRate = 10
            const colorCounts = {}
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const data = imageData.data
            
            for (let i = 0; i < data.length; i += 4 * sampleRate) {
              const r = data[i]
              const g = data[i + 1]
              const b = data[i + 2]
              const a = data[i + 3]
              
              if (a < 128) continue
              
              const brightness = (r * 0.299 + g * 0.587 + b * 0.114)
              if (brightness < 30) continue
              
              const quantizedR = Math.floor(r / 32) * 32
              const quantizedG = Math.floor(g / 32) * 32
              const quantizedB = Math.floor(b / 32) * 32
              
              const colorKey = `${quantizedR},${quantizedG},${quantizedB}`
              const saturation = Math.max(r, g, b) - Math.min(r, g, b)
              const weight = 1 + (brightness / 255) * 0.5 + (saturation / 255) * 0.5
              
              colorCounts[colorKey] = (colorCounts[colorKey] || 0) + weight
            }
            
            let maxCount = 0
            let dominantColor = null
            
            for (const [colorKey, count] of Object.entries(colorCounts)) {
              const [r, g, b] = colorKey.split(',').map(Number)
              const brightness = (r * 0.299 + g * 0.587 + b * 0.114)
              
              if (brightness >= 50 && count > maxCount) {
                maxCount = count
                dominantColor = colorKey
              }
            }
            
            if (!dominantColor && Object.keys(colorCounts).length > 0) {
              let maxBrightness = 0
              for (const [colorKey] of Object.entries(colorCounts)) {
                const [r, g, b] = colorKey.split(',').map(Number)
                const brightness = (r * 0.299 + g * 0.587 + b * 0.114)
                if (brightness > maxBrightness) {
                  maxBrightness = brightness
                  dominantColor = colorKey
                }
              }
            }
            
            if (dominantColor) {
              const [r, g, b] = dominantColor.split(',').map(Number)
              const hexColor = `#${[r, g, b].map(x => {
                const hex = x.toString(16)
                return hex.length === 1 ? '0' + hex : hex
              }).join('')}`
              
              console.log('[ColorExtractor] Extracted color (no CORS):', hexColor)
              resolve(hexColor)
            } else {
              reject(new Error('No dominant color found'))
            }
          } catch (err) {
            reject(err)
          }
        }
        img2.onerror = () => reject(new Error('Failed to load image even without CORS'))
        img2.src = imageUrl
      } else {
        reject(error)
      }
    }
    
    img.src = imageUrl
  })
}

