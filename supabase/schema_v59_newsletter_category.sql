-- ============================================
-- Festival Hub · Schema v59 · 뉴스레터 게시글 카테고리
--  · newsletter_posts.category: 페스티벌·행사·축제·푸드트럭·플리마켓·기타
--  · /news 단일 피드에서 자동 뉴스(키워드)와 함께 카테고리 탭으로 필터
-- 재실행 안전.
-- ============================================

alter table public.newsletter_posts
  add column if not exists category text not null default '기타';
