import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { scanTextContent, scanUserProfile, scanPostContent, scanCommentContent, submitFlag } from '$lib/services/moderation';

// POST /api/moderation/scan - Scan content for moderation issues
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { contentType, contentId, content } = await request.json();
		
		if (!contentType || !content) {
			throw error(400, 'Content type and content are required');
		}
		
		let result;
		
		// Scan content based on type
		switch (contentType) {
			case 'text':
				result = await scanTextContent(content);
				break;
			case 'user_profile':
				result = await scanUserProfile(content);
				break;
			case 'post':
				result = await scanPostContent(content);
				break;
			case 'comment':
				result = await scanCommentContent(content);
				break;
			default:
				throw error(400, 'Unsupported content type');
		}
		
		// If content is flagged, submit a flag to the database
		if (result.flagged && contentId) {
			await submitFlag(
				contentType,
				contentId,
				result.flagType!,
				result.confidenceScore!,
				result.details,
				locals.supabase
			);
		}
		
		return json({
			success: true,
			flagged: result.flagged,
			flagType: result.flagged ? result.flagType : null,
			confidenceScore: result.flagged ? result.confidenceScore : null,
			details: result.flagged ? result.details : null
		});
	} catch (err: any) {
		console.error('Error scanning content:', err);
		throw error(500, err.message || 'Failed to scan content');
	}
};

// GET /api/moderation/scan - Health check endpoint
export const GET: RequestHandler = async () => {
	return json({
		success: true,
		message: 'Content moderation scanning service is running',
		timestamp: new Date().toISOString()
	});
};