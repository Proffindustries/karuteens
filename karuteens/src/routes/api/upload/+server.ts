import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';

const r2Client = new S3Client({
	region: 'auto',
	endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: env.R2_ACCESS_KEY_ID || '',
		secretAccessKey: env.R2_SECRET_ACCESS_KEY || ''
	}
});

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await locals.safeGetSession();
	
	if (!user) {
		throw error(401, 'Unauthorized');
	}

	try {
		const formData = await request.formData();
		const file = formData.get('file') as File;
		const userId = formData.get('userId') as string;
		
		if (!file) {
			throw error(400, 'No file provided');
		}

		// Validate file size (50MB max)
		if (file.size > 50 * 1024 * 1024) {
			throw error(400, 'File size must be less than 50MB');
		}

		// Determine file type and folder
		let folder = 'files';
		if (file.type.startsWith('image/')) folder = 'images';
		else if (file.type.startsWith('video/')) folder = 'videos';
		else if (file.type.startsWith('audio/')) folder = 'audio';
		else if (file.type === 'application/pdf') folder = 'documents';

		// Generate unique filename
		const fileExt = file.name.split('.').pop();
		const fileName = `${folder}/${userId}-${Date.now()}.${fileExt}`;

		// Convert file to buffer
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Upload to R2
		const command = new PutObjectCommand({
			Bucket: env.R2_BUCKET || 'karuteens',
			Key: fileName,
			Body: buffer,
			ContentType: file.type
		});

		await r2Client.send(command);

		// Generate public URL
		const baseUrl = env.R2_PUBLIC_BASE_URL || 'https://pub-28c19b60cac841aa92b4fa478bd350c6.r2.dev';
		const publicUrl = `${baseUrl}/${fileName}`;

		console.log('File uploaded:', publicUrl);

		return json({ url: publicUrl });
	} catch (err: any) {
		console.error('Upload error:', err);
		throw error(err.status || 500, err.message || 'Failed to upload file');
	}
};
