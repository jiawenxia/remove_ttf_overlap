#!/usr/bin/env python3

import sys
import os
import base64
import argparse
import logging
from fontTools.ttLib import TTFont
from fontTools.ttLib.removeOverlaps import removeOverlaps
import json

# 设置日志
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def process_font(input_path, output_path, keep_hinting=False, ignore_errors=True, keep_vars=False):
    """处理字体文件，移除重叠"""
    logger.info(f"加载字体: {input_path}")
    font = TTFont(input_path)
    
    # 如果需要移除可变字体功能
    if not keep_vars:
        variable_tables = ["fvar", "gvar", "avar", "cvar", "STAT", "HVAR", "MVAR", "VVAR"]
        for table in variable_tables:
            if table in font:
                logger.info(f"移除表: {table}")
                del font[table]
    
    logger.info("开始移除重叠...")
    # 执行重叠移除
    removeOverlaps(
        font=font,
        glyphNames=None,  # 处理所有字形
        removeHinting=not keep_hinting,
        ignoreErrors=ignore_errors
    )
    
    logger.info(f"保存处理后的字体: {output_path}")
    font.save(output_path)
    logger.info("字体处理完成!")
    
    return True

def main():
    parser = argparse.ArgumentParser(description='字体去重叠处理工具')
    parser.add_argument('input_file', help='输入字体文件路径')
    parser.add_argument('output_file', help='输出字体文件路径')
    parser.add_argument('--keep-hinting', action='store_true', help='保留提示信息')
    parser.add_argument('--ignore-errors', action='store_true', help='忽略错误')
    parser.add_argument('--keep-vars', action='store_true', help='保留可变字体功能')
    parser.add_argument('--from-base64', action='store_true', help='输入是Base64编码的字体')
    
    args = parser.parse_args()
    
    try:
        input_file = args.input_file
        # 如果是Base64，先解码
        if args.from_base64:
            logger.info("从Base64解码字体文件")
            with open(input_file, 'r') as f:
                base64_font = f.read()
            
            binary_font = base64.b64decode(base64_font)
            temp_input = f"temp_input_{os.path.basename(input_file)}"
            with open(temp_input, 'wb') as f:
                f.write(binary_font)
            input_file = temp_input
        
        process_font(
            input_file, 
            args.output_file,
            keep_hinting=args.keep_hinting,
            ignore_errors=args.ignore_errors,
            keep_vars=args.keep_vars
        )
        
        # 如果是临时文件，清理它
        if args.from_base64 and os.path.exists(temp_input):
            os.remove(temp_input)
            
        sys.exit(0)
    except Exception as e:
        logger.error(f"处理错误: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
