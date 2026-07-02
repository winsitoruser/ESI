import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { promises as fs } from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Create uploads directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'recipes');
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }

    // Handle file upload
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `recipe-${timestamp}-${file.originalname}`;
    const filepath = path.join(uploadDir, filename);

    // Move file to uploads directory
    const buffer = Buffer.from(file.buffer);
    await fs.writeFile(filepath, buffer);

    // Return the file URL
    const fileUrl = `/uploads/recipes/${filename}`;

    return res.status(200).json({
      success: true,
      url: fileUrl
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
}
