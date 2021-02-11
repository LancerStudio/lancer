
const exportedColors = [
  {
    "paletteName": "Grays",
    "swatches": [
      {
        "name": "gray-900",
        "color": "111111"
      },
      {
        "name": "gray-800",
        "color": "2A2A2A"
      },
      {
        "name": "gray-700",
        "color": "515151"
      },
      {
        "name": "gray-600",
        "color": "7B7B7B"
      },
      {
        "name": "gray-500",
        "color": "A6A6A6"
      },
      {
        "name": "gray-400",
        "color": "C6C6C6"
      },
      {
        "name": "gray-300",
        "color": "DCDCDC"
      },
      {
        "name": "gray-200",
        "color": "E9E9E9"
      },
      {
        "name": "gray-100",
        "color": "F7F7F7"
      },
      {
        "name": "gray-50",
        "color": "FEFEFE"
      }
    ]
  },
  {
    "paletteName": "Indigos",
    "swatches": [
      {
        "name": "indigo-900",
        "color": "1D2437"
      },
      {
        "name": "indigo-800",
        "color": "354267"
      },
      {
        "name": "indigo-700",
        "color": "4B5E95"
      },
      {
        "name": "indigo-600",
        "color": "627BBF"
      },
      {
        "name": "indigo-500",
        "color": "728FDE"
      },
      {
        "name": "indigo-400",
        "color": "7C9CF5"
      },
      {
        "name": "indigo-300",
        "color": "82A3FF"
      },
      {
        "name": "indigo-200",
        "color": "99BAFF"
      },
      {
        "name": "indigo-100",
        "color": "D1E3FF"
      },
      {
        "name": "indigo-50",
        "color": "FDFEFF"
      }
    ]
  }
]

module.exports = {
  purge: [
    './src/client/**/*',
  ],
  // darkMode: 'media', // or 'media' or 'class'
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
      }),

      fontFamily: {
        header: [`'Montserrat', sans-serif`],
        'header-alt': [`'Montserrat Alternates', 'Montserrat', sans-serif`],
      }
    },
  },
  variants: {
    extend: {
      // typography: ['dark']
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
}
