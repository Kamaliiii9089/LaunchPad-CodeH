import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { connectDB } from '@/lib/mongodb';
import KnowledgeBaseArticle from '@/models/KnowledgeBaseArticle';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    jwt.verify(token, JWT_SECRET);
    
    await connectDB();

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const threatType = searchParams.get('threatType');
    const featured = searchParams.get('featured') === 'true';
    const slug = searchParams.get('slug');

    let query: any = { published: true };

    if (slug) {
      const article: any = await KnowledgeBaseArticle.findOne({ slug, published: true }).lean();
      if (!article) {
        return NextResponse.json({ error: 'Article not found' }, { status: 404 });
      }
      
      // Increment views
      await KnowledgeBaseArticle.findByIdAndUpdate(article._id, { $inc: { views: 1 } });
      
      return NextResponse.json({ success: true, article });
    }

    if (category) {
      query.category = category;
    }
    if (threatType) {
      query.threatTypes = threatType;
    }
    if (featured) {
      query.featured = true;
    }
    if (search) {
      query.$text = { $search: search };
    }

    const articles = await KnowledgeBaseArticle.find(query)
      .select('-content') // Don't send full content in list view
      .sort({ featured: -1, views: -1, createdAt: -1 })
      .limit(50)
      .lean();

    return NextResponse.json({ 
      success: true, 
      articles,
      totalArticles: articles.length 
    });
  } catch (error: any) {
    console.error('Get KB articles error:', error);
    return NextResponse.json({ error: error.message || 'Failed to get articles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const body = await request.json();
    const { helpful, articleId } = body;

    if (!articleId || helpful === undefined) {
      return NextResponse.json({ error: 'Article ID and helpful flag are required' }, { status: 400 });
    }

    await connectDB();

    const updateField = helpful ? 'helpful' : 'notHelpful';
    const article = await KnowledgeBaseArticle.findByIdAndUpdate(
      articleId,
      { $inc: { [updateField]: 1 } },
      { new: true }
    );

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Feedback recorded successfully' 
    });
  } catch (error: any) {
    console.error('KB feedback error:', error);
    return NextResponse.json({ error: error.message || 'Failed to record feedback' }, { status: 500 });
  }
}
