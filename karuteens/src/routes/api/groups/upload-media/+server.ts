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
		const groupId = formData.get('groupId') as string;
		
		if (!file || !groupId) {
			throw error(400, 'Missing file or groupId');
		}

		// Verify user is member of group
		const { supabase } = locals;
		const { data: member } = await supabase
			.from('group_members')
			.select('id')
			.eq('group_id', groupId)
			.eq('user_id', user.id)
			.single();

		if (!member) {
			throw error(403, 'Not a member of this group');
		}

		// Validate file size (10MB max)
		if (file.size > 10 * 1024 * 1024) {
			throw error(400, 'File size must be less than 10MB');
		}

		// Determine media type
		let mediaType = 'file';
		if (file.type.startsWith('image/')) mediaType = 'image';
		else if (file.type.startsWith('video/')) mediaType = 'video';

		// Generate unique filename
		const fileExt = file.name.split('.').pop();
		const fileName = `groups/${groupId}/${user.id}-${Date.now()}.${fileExt}`;

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

		return json({ url: publicUrl, mediaType });
	} catch (err: any) {
		console.error('Media upload error:', err);
		throw error(err.status || 500, err.message || 'Failed to upload media');
	}
};
