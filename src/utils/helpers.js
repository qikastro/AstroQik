// ── Response Helpers ──────────────────────────────────────────────────────────
export const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({ success: true, message, data });
};

export const errorResponse = (res, message = 'Something went wrong', statusCode = 500, errors = null) => {
  const payload = { success: false, message };
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
};

// ── Pagination ────────────────────────────────────────────────────────────────
export const parsePagination = (query) => {
  const page  = Math.max(1, parseInt(query.page  || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10', 10)));
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
};

export const paginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.ceil(total / limit),
  hasNextPage: page * limit < total,
  hasPrevPage: page > 1,
});

// ── Date Formatters ───────────────────────────────────────────────────────────
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
};
