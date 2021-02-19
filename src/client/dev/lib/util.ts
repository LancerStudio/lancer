
export function debounce<F extends (...args: any[]) => any>(func: F, wait: number, immediate=false): F {
	var timeout: any
	const f: any = function(this: any) {
		var context = this, args = arguments as any;
		var later = function() {
			timeout = undefined;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	}
	return f
}

export function last<T>(array: T[]) {
	return array[array.length-1]
}

export function capitalize(str: string) {
	return str[0]!.toUpperCase() + str.slice(1)
}

export function firstWord(str: string) {
	return str.split(' ')[0]
}

export function copyToClipboard(text: string) {
	var input = document.createElement('input')
	input.setAttribute('value', text)
	document.body.appendChild(input)
	input.select()
	var result = document.execCommand('copy')
	document.body.removeChild(input)
	return result
}
