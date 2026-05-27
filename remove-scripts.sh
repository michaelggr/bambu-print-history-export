#!/bin/bash
# 从 git 历史中彻底删除 scripts 目录
export FILTER_BRANCH_SQUELCH_WARNING=1
cd /g/dev/ha/ha/bambu-export-web
git filter-branch --force --index-filter 'git rm -rf --cached --ignore-unmatch scripts/' --prune-empty HEAD
