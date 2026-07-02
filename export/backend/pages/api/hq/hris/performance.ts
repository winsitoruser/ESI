import type { NextApiRequest, NextApiResponse } from 'next';
import { triggerHRISWebhook } from './webhooks';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    switch (req.method) {
      case 'GET':
        return await getPerformanceReviews(req, res);
      case 'POST':
        return await createPerformanceReview(req, res);
      case 'PUT':
        return await updatePerformanceReview(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Performance Review API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function getPerformanceReviews(req: NextApiRequest, res: NextApiResponse) {
  const { employeeId, period, status } = req.query;

  // Mock data - in production, query from PerformanceReview model
  const reviews = [
    {
      id: '1', employeeId: '1', employeeName: 'Ahmad Wijaya', position: 'Branch Manager', branchName: 'Cabang Pusat Jakarta', department: 'Operations',
      reviewPeriod: 'Q4 2025', reviewDate: '2026-01-15', reviewer: 'Super Admin', overallRating: 4.8,
      categories: [
        { name: 'Kepemimpinan', rating: 5, weight: 25, comments: 'Excellent leadership skills' },
        { name: 'Pencapaian Target', rating: 4.5, weight: 30, comments: 'Consistently exceeds targets' },
        { name: 'Komunikasi', rating: 4.8, weight: 15, comments: 'Great communicator' },
        { name: 'Problem Solving', rating: 4.7, weight: 15, comments: 'Quick problem resolution' },
        { name: 'Teamwork', rating: 5, weight: 15, comments: 'Excellent team player' }
      ],
      strengths: ['Strategic thinking', 'Team motivation', 'Customer focus'],
      areasForImprovement: ['Delegation skills', 'Work-life balance'],
      goals: ['Expand branch revenue by 15%', 'Develop 2 future managers'],
      status: 'acknowledged'
    },
    {
      id: '2', employeeId: '2', employeeName: 'Siti Rahayu', position: 'Branch Manager', branchName: 'Cabang Bandung', department: 'Operations',
      reviewPeriod: 'Q4 2025', reviewDate: '2026-01-18', reviewer: 'Super Admin', overallRating: 4.5,
      categories: [
        { name: 'Kepemimpinan', rating: 4.5, weight: 25, comments: 'Good leadership' },
        { name: 'Pencapaian Target', rating: 4.5, weight: 30, comments: 'Meets targets consistently' },
        { name: 'Komunikasi', rating: 4.5, weight: 15, comments: 'Effective communicator' },
        { name: 'Problem Solving', rating: 4.3, weight: 15, comments: 'Good analytical skills' },
        { name: 'Teamwork', rating: 4.7, weight: 15, comments: 'Strong team builder' }
      ],
      strengths: ['Process improvement', 'Team development', 'Customer service'],
      areasForImprovement: ['Time management', 'Strategic planning'],
      goals: ['Improve customer satisfaction to 95%', 'Reduce operational costs by 10%'],
      status: 'reviewed'
    },
    {
      id: '3', employeeId: '3', employeeName: 'Budi Santoso', position: 'Branch Manager', branchName: 'Cabang Surabaya', department: 'Operations',
      reviewPeriod: 'Q4 2025', reviewDate: '2026-01-20', reviewer: 'Super Admin', overallRating: 3.8,
      categories: [
        { name: 'Kepemimpinan', rating: 3.5, weight: 25, comments: 'Needs improvement' },
        { name: 'Pencapaian Target', rating: 3.8, weight: 30, comments: 'Below target' },
        { name: 'Komunikasi', rating: 4.0, weight: 15, comments: 'Adequate' },
        { name: 'Problem Solving', rating: 3.7, weight: 15, comments: 'Slow response' },
        { name: 'Teamwork', rating: 4.2, weight: 15, comments: 'Good collaboration' }
      ],
      strengths: ['Technical knowledge', 'Product expertise'],
      areasForImprovement: ['Sales management', 'Team motivation', 'Target achievement'],
      goals: ['Achieve 100% sales target', 'Improve team productivity by 20%'],
      status: 'submitted'
    }
  ];

  let filteredReviews = reviews;
  if (employeeId) {
    filteredReviews = filteredReviews.filter(r => r.employeeId === employeeId);
  }
  if (period) {
    filteredReviews = filteredReviews.filter(r => r.reviewPeriod === period);
  }
  if (status) {
    filteredReviews = filteredReviews.filter(r => r.status === status);
  }

  return res.status(200).json({ 
    reviews: filteredReviews,
    summary: {
      total: reviews.length,
      avgRating: reviews.reduce((sum, r) => sum + r.overallRating, 0) / reviews.length,
      excellent: reviews.filter(r => r.overallRating >= 4.5).length,
      good: reviews.filter(r => r.overallRating >= 3.5 && r.overallRating < 4.5).length,
      needsImprovement: reviews.filter(r => r.overallRating < 3.5).length
    }
  });
}

async function createPerformanceReview(req: NextApiRequest, res: NextApiResponse) {
  const { employeeId, employeeName, branchId, branchName, reviewPeriod, reviewerId, categories, strengths, areasForImprovement, goals } = req.body;

  if (!employeeId || !reviewPeriod || !reviewerId) {
    return res.status(400).json({ error: 'Employee ID, review period, and reviewer ID are required' });
  }

  // Calculate overall rating
  let totalWeight = 0;
  let weightedSum = 0;
  if (categories && categories.length > 0) {
    categories.forEach((cat: any) => {
      totalWeight += cat.weight || 0;
      weightedSum += (cat.rating || 0) * (cat.weight || 0);
    });
  }
  const overallRating = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // In production, save to database
  const newReview = {
    id: Date.now().toString(),
    employeeId,
    employeeName,
    branchId,
    branchName,
    reviewPeriod,
    reviewerId,
    reviewDate: new Date().toISOString().split('T')[0],
    categories,
    strengths,
    areasForImprovement,
    goals,
    overallRating: Math.round(overallRating * 10) / 10,
    status: 'draft',
    createdAt: new Date().toISOString()
  };

  // Trigger webhook
  await triggerHRISWebhook(
    'performance.review_created',
    employeeId,
    employeeName || 'Unknown',
    newReview,
    branchId,
    branchName
  );

  return res.status(201).json({ review: newReview, message: 'Performance review created successfully' });
}

async function updatePerformanceReview(req: NextApiRequest, res: NextApiResponse) {
  const { id, status, employeeComments, managerComments, categories, overallRating } = req.body;

  if (!id) {
    return res.status(400).json({ error: 'Review ID is required' });
  }

  // In production, update database
  const updatedReview = {
    id,
    status,
    employeeComments,
    managerComments,
    categories,
    overallRating,
    updatedAt: new Date().toISOString()
  };

  // Trigger appropriate webhook based on status change
  if (status === 'submitted') {
    await triggerHRISWebhook(
      'performance.review_submitted',
      'employee-id',
      'Employee Name',
      updatedReview
    );
  } else if (status === 'acknowledged') {
    await triggerHRISWebhook(
      'performance.review_acknowledged',
      'employee-id',
      'Employee Name',
      updatedReview
    );
  }

  return res.status(200).json({ review: updatedReview, message: 'Performance review updated successfully' });
}
