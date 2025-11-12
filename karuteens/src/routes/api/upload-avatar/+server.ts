import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';

// Initialize R2 client
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
		
		if (!file) {
			throw error(400, 'No file provided');
		}

		// Validate file type
		if (!file.type.startsWith('image/')) {
			throw error(400, 'File must be an image');
		}

		// Validate file size (5MB max)
		if (file.size > 5 * 1024 * 1024) {
			throw error(400, 'File size must be less than 5MB');
		}

		// Generate unique filename
		const fileExt = file.name.split('.').pop();
		const fileName = `avatars/${user.id}-${Date.now()}.${fileExt}`;

		// Convert file to buffer
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Upload to R2
		const command = new PutObjectCommand({
			Bucket: env.R2_BUCKET || 'karuteens',
			Key: fileName,
			Body: buffer,
			ContentType: file.type
			// Note: R2 doesn't support ACL parameter - use bucket settings instead
		});

		await r2Client.send(command);

		// Generate public URL
		console.log('Environment R2_PUBLIC_BASE_URL:', env.R2_PUBLIC_BASE_URL);
		console.log('All env vars:', Object.keys(env));
		
		const baseUrl = env.R2_PUBLIC_BASE_URL || 'https://pub-28c19b60cac841aa92b4fa478bd350c6.r2.dev';
		const publicUrl = `${baseUrl}/${fileName}`;
		
		console.log('R2 Base URL:', baseUrl);
		console.log('Generated public URL:', publicUrl);

		return json({ url: publicUrl });
	} catch (err: any) {
		console.error('Avatar upload error:', err);
		throw error(500, err.message || 'Failed to upload avatar');
	}
};
