import { NextRequest, NextResponse } from 'next/server';
import { ConsultationService } from '@/lib/services/consultationService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const consultationService = new ConsultationService();
    const sessions = consultationService.getRecentSessions(limit);

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('履歴取得エラー:', error);
    return NextResponse.json(
      { error: '履歴の取得に失敗しました' },
      { status: 500 }
    );
  }
}