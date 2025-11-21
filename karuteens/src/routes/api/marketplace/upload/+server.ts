import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

// POST /api/marketplace/upload - Upload images for marketplace listings
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Get user from session
		const { user } = await locals.safeGetSession();
		
		if (!user) {
			throw error(401, 'Unauthorized');
		}
		
		// Check if we have file upload data
		const contentType = request.headers.get('content-type') || '';
		if (!contentType.includes('multipart/form-data')) {
			throw error(400, 'Invalid content type. Expected multipart/form-data');
		}
		
		// Parse form data
		const formData = await request.formData();
		const file = formData.get('file') as File;
		const listingId = formData.get('listing_id') as string;
		
		if (!file) {
			throw error(400, 'No file provided');
		}
		
		// Validate file type
		if (!file.type.startsWith('image/')) {
			throw error(400, 'Only image files are allowed');
		}
		
		// Validate file size (50MB max)
		if (file.size > 50 * 1024 * 1024) {
			throw error(400, 'File size must be less than 50MB');
		}
		
		// If listingId is provided, verify user has access to it
		if (listingId) {
			const supabase = locals.supabase;
			const { data: listing, error: listingError } = await supabase
				.from('marketplace_listings')
				.select('seller_id')
				.eq('id', listingId)
				.eq('seller_id', user.id)
				.maybeSingle();
			
			if (listingError) {
				throw new Error(listingError.message);
			}
			
			if (!listing) {
				throw error(403, 'Unauthorized to upload images for this listing');
			}
		}
		
		// Generate unique filename
		const fileExtension = file.name.split('.').pop() || 'jpg';
		const filename = `${uuidv4()}.${fileExtension}`;
		const key = `marketplace/${user.id}/${filename}`;
		
		// For now, we'll return a mock URL since we don't have actual S3 configured
		// In a real implementation, you would upload to S3 or another storage service
		const mockUrl = `https://example.com/${key}`;
		
		// Simulate upload delay
		await new Promise(resolve => setTimeout(resolve, 500));
		
		return json({
			success: true,
			url: mockUrl,
			filename,
			size: file.size
		});
	} catch (err: any) {
		console.error('Error uploading image:', err);
		throw error(500, err.message || 'Failed to upload image');
	}
};

// Fallback for other methods
export const fallback: RequestHandler = async ({ request }) => {
	throw error(405, 'Method not allowed');
};