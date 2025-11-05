#!/bin/bash

echo "🚀 开始部署到Vercel..."
echo ""
echo "步骤1: 登录Vercel（如果未登录）"
vercel login

echo ""
echo "步骤2: 首次部署预览"
vercel

echo ""
echo "✅ 预览部署完成！"
echo ""
read -p "是否部署到生产环境？(Y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo "步骤3: 部署到生产环境"
    vercel --prod
    echo ""
    echo "🎉 生产环境部署完成！"
fi

echo ""
echo "📊 查看所有部署："
vercel ls

echo ""
echo "✅ 部署完成！访问控制台查看：https://vercel.com/dashboard"
