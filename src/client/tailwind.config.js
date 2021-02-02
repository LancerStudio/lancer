
const exportedColors = [
  {
    "paletteName": "Grays",
    "swatches": [
      {
        "name": "gray-900",
        "color": "1D1F1F"
      },
      {
        "name": "gray-800",
        "color": "2D2F30"
      },
      {
        "name": "gray-700",
        "color": "4D4F51"
      },
      {
        "name": "gray-600",
        "color": "76797B"
      },
      {
        "name": "gray-500",
        "color": "9FA3A6"
      },
      {
        "name": "gray-400",
        "color": "BEC2C6"
      },
      {
        "name": "gray-300",
        "color": "D5D8DC"
      },
      {
        "name": "gray-200",
        "color": "E3E6E9"
      },
      {
        "name": "gray-100",
        "color": "F4F8FB"
      },
      {
        "name": "gray-50",
        "color": "F9FAFB"
      }
    ]
  },
  {
    "paletteName": "Blues",
    "swatches": [
      {
        "name": "blue-900",
        "color": "212B34"
      },
      {
        "name": "blue-800",
        "color": "283643"
      },
      {
        "name": "blue-700",
        "color": "405463"
      },
      {
        "name": "blue-600",
        "color": "5B7081"
      },
      {
        "name": "blue-500",
        "color": "768C9B"
      },
      {
        "name": "blue-400",
        "color": "9DAEBA"
      },
      {
        "name": "blue-300",
        "color": "CFDAE0"
      },
      {
        "name": "blue-200",
        "color": "E3E7E8"
      },
      {
        "name": "blue-100",
        "color": "F4F5F7"
      }
    ]
  },
  {
    "paletteName": "Primaries",
    "swatches": [
      {
        "name": "primary-900",
        "color": "0D243C"
      },
      {
        "name": "primary-800",
        "color": "113B61"
      },
      {
        "name": "primary-700",
        "color": "165B92"
      },
      {
        "name": "primary-600",
        "color": "1C7FC2"
      },
      {
        "name": "primary-500",
        "color": "259BE5"
      },
      {
        "name": "primary-400",
        "color": "37A2E5"
      },
      {
        "name": "primary-300",
        "color": "5EB9EF"
      },
      {
        "name": "primary-200",
        "color": "97D2F2"
      },
      {
        "name": "primary-100",
        "color": "F4F6F7"
      }
    ]
  }
]

module.exports = {
  purge: [
    './src/client/dev/**/*',
  ],
  darkMode: 'media', // or 'media' or 'class'
  theme: {
    extend: {
      colors: exportedColors.map(c => c.swatches).reduce((a,b) => a.concat(b), []).reduce((out, row) => {
        const [colorName, shade] = row.name.split('-')
        out[colorName] = out[colorName] || {}
        out[colorName][shade] = `#${row.color}`
        return out
      }, {}),

      typography: theme => ({
        dark: {
          css: {
            color: theme('colors.blue.200')
          }
        },
      })
    },
  },
  variants: {
    extend: {
      typography: ['dark']
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
}
