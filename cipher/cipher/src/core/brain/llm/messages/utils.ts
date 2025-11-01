import { logger } from '../../../logger/index.js';

export function getImageData(imagePart: {
	image: string | Uint8Array | Buffer | ArrayBuffer | URL;
}): string {
	const { image } = imagePart;
	if (typeof image === 'string') {
		return image;
	} else if (image instanceof Buffer) {
		return image.toString('base64');
	} else if (image instanceof Uint8Array) {
		return Buffer.from(image).toString('base64');
	} else if (image instanceof ArrayBuffer) {
		return Buffer.from(new Uint8Array(image)).toString('base64');
	} else if (image instanceof URL) {
		return image.toString();
	}
	logger.warn('Unexpected image data type in getImageData', { image });
	return '';
}
