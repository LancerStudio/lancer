
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
