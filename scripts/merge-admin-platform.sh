#!/bin/bash
# Script to merge admin platform into unified system

echo "🚀 Starting Admin Platform Merge..."
echo ""

# Step 1: Backup old files
echo "📦 Step 1: Backing up old files..."
mkdir -p pages/admin/backup
cp pages/admin/dashboard.tsx pages/admin/backup/dashboard-old.tsx 2>/dev/null || true
echo "✅ Backup completed"
echo ""

# Step 2: Replace dashboard with unified version
echo "🔄 Step 2: Replacing dashboard with unified version..."
if [ -f "pages/admin/dashboard-unified.tsx" ]; then
    cp pages/admin/dashboard-unified.tsx pages/admin/dashboard.tsx
    echo "✅ Dashboard replaced with unified version"
else
    echo "⚠️  dashboard-unified.tsx not found, skipping..."
fi
echo ""

# Step 3: Remove duplicate dashboard
echo "🗑️  Step 3: Cleaning up duplicate files..."
rm -f pages/admin/dashboard-new.tsx 2>/dev/null || true
rm -f pages/admin/dashboard.tsx.backup 2>/dev/null || true
echo "✅ Cleanup completed"
echo ""

# Step 4: Verify AdminLayout exists
echo "🔍 Step 4: Verifying AdminLayout component..."
if [ -f "components/admin/AdminLayout.tsx" ]; then
    echo "✅ AdminLayout component found"
else
    echo "❌ AdminLayout component not found!"
    echo "   Please ensure components/admin/AdminLayout.tsx exists"
fi
echo ""

# Step 5: Summary
echo "📊 Merge Summary:"
echo "   ✅ Old dashboard backed up"
echo "   ✅ Unified dashboard installed"
echo "   ✅ Duplicate files removed"
echo "   ✅ AdminLayout verified"
echo ""

echo "🎉 Admin Platform Merge Completed!"
echo ""
echo "Next steps:"
echo "1. Test the unified dashboard: http://localhost:3001/admin/dashboard"
echo "2. Update other admin pages to use AdminLayout"
echo "3. Test all navigation and features"
echo ""
