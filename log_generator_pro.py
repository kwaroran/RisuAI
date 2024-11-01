import base64
import contextlib
import glob
import json
import os
import re
import shutil
import struct
import sys
import traceback
import gc
from collections import OrderedDict
from datetime import datetime
from enum import Enum
from io import BytesIO
from time import time

# PyQt6 관련
from PyQt6.QtCore import (
    QSettings,
    QSize,
    QStandardPaths,
    Qt,
    QTimer,
    pyqtSignal
)
from PyQt6.QtGui import (
    QClipboard,
    QColor,
    QCursor,
    QFont,
    QIcon,
    QPalette
)
from PyQt6.QtWidgets import (
    QApplication,
    QCheckBox,
    QColorDialog,
    QComboBox,
    QDialog,
    QDialogButtonBox,
    QFileDialog,
    QFrame,
    QGridLayout,
    QGroupBox,
    QHBoxLayout,
    QInputDialog,
    QLabel,
    QLineEdit,
    QListWidget,
    QListWidgetItem,
    QMainWindow,
    QMenu,
    QMessageBox,
    QPushButton,
    QScrollArea,
    QSlider,
    QSpinBox,
    QSplitter,
    QTabWidget,
    QTextEdit,
    QVBoxLayout,
    QWidget
)

# 추가 라이브러리
import zipfile



class CacheManager:
    def __init__(self, max_size=100, max_age=3600):  # 기본 1시간 캐시
        self.max_size = max_size
        self.max_age = max_age
        self.cache = OrderedDict()
        self.timestamps = {}
        self.templates = TEMPLATE_PRESETS.copy()
        
    def get(self, key):
        """캐시에서 값 가져오기"""
        try:
            if key in self.cache:
                # 만료 확인
                if time() - self.timestamps[key] > self.max_age:
                    self.remove(key)
                    return None
                    
                # LRU 업데이트
                self.cache.move_to_end(key)
                return self.cache[key]
            return None
            
        except Exception as e:
            print(f"캐시 조회 중 오류: {str(e)}")
            return None
            
    def set(self, key, value):
        """캐시에 값 저장"""
        try:
            # 용량 초과 시 가장 오래된 항목 제거
            if len(self.cache) >= self.max_size:
                oldest_key = next(iter(self.cache))
                self.remove(oldest_key)
                
            self.cache[key] = value
            self.timestamps[key] = time()
            self.cache.move_to_end(key)
            
        except Exception as e:
            print(f"캐시 저장 중 오류: {str(e)}")
            
    def remove(self, key):
        """캐시에서 항목 제거"""
        try:
            if key in self.cache:
                del self.cache[key]
                del self.timestamps[key]
                
        except Exception as e:
            print(f"캐시 항목 제거 중 오류: {str(e)}")
            
    def clear(self):
        """캐시 전체 초기화"""
        try:
            self.cache.clear()
            self.timestamps.clear()
            
        except Exception as e:
            print(f"캐시 초기화 중 오류: {str(e)}")
            
    def cleanup_expired(self):
        """만료된 캐시 항목 정리"""
        try:
            current_time = time()
            expired_keys = [
                key for key, timestamp in self.timestamps.items()
                if current_time - timestamp > self.max_age
            ]
            
            for key in expired_keys:
                self.remove(key)
                
            return len(expired_keys)
            
        except Exception as e:
            print(f"만료 캐시 정리 중 오류: {str(e)}")
            return 0
            
    def get_stats(self):
        """캐시 상태 통계"""
        try:
            return {
                'total_items': len(self.cache),
                'max_size': self.max_size,
                'current_size': len(self.cache),
                'utilization': f"{(len(self.cache) / self.max_size * 100):.1f}%",
                'oldest_item_age': time() - min(self.timestamps.values()) if self.timestamps else 0,
                'newest_item_age': time() - max(self.timestamps.values()) if self.timestamps else 0
            }
            
        except Exception as e:
            print(f"통계 수집 중 오류: {str(e)}")
            return {}

class ImageCacheManager(CacheManager):
    """이미지 전용 캐시 매니저"""
    def __init__(self, max_size=50, max_age=3600*24, max_total_size_mb=100):
        super().__init__(max_size, max_age)
        self.total_size = 0  # 바이트 단위
        self.max_total_size = max_total_size_mb * 1024 * 1024  # MB를 바이트로 변환
        
    def set(self, key, image_data):
        """이미지 데이터 캐시 저장"""
        if not image_data:
            return
            
        try:
            data_size = len(image_data)
            
            # 새 데이터가 최대 크기를 초과하는 경우
            if data_size > self.max_total_size:
                raise ValueError("이미지가 최대 허용 크기를 초과합니다")
            
            # 공간 확보
            self._ensure_space_available(data_size)
            
            # 새 항목 추가
            super().set(key, image_data)
            self.total_size += data_size
            
        except Exception as e:
            logger.error(f"이미지 캐시 저장 중 오류: {str(e)}")
            raise
            
    def _ensure_space_available(self, required_size):
        """필요한 공간을 확보하기 위해 오래된 항목들을 제거"""
        while self.cache and self.total_size + required_size > self.max_total_size:
            oldest_key = min(self.cache.keys(), key=lambda k: self.cache[k].timestamp)
            self.remove(oldest_key)
            
    def remove(self, key):
        """이미지 캐시 항목 제거"""
        try:
            if key in self.cache:
                self.total_size -= len(self.cache[key].data)
                super().remove(key)
                
        except Exception as e:
            logger.error(f"이미지 캐시 제거 중 오류: {str(e)}")
            
    def cleanup_expired(self):
        """만료된 캐시 항목 정리"""
        try:
            cleaned_count = 0
            current_time = time.time()
            
            # 만료된 항목들을 찾아서 제거
            expired_keys = [
                key for key, item in self.cache.items()
                if current_time - item.timestamp > self.max_age
            ]
            
            for key in expired_keys:
                self.remove(key)
                cleaned_count += 1
                
            if cleaned_count > 0:
                logger.info(f"캐시 정리 완료: {cleaned_count}개 항목 제거")
                logger.debug(f"현재 캐시 상태: {self.get_stats()}")
                
            return cleaned_count
            
        except Exception as e:
            logger.error(f"캐시 정리 중 오류: {str(e)}")
            return 0
            
    def get_stats(self):
        """이미지 캐시 상태 통계"""
        try:
            stats = super().get_stats()
            current_time = time.time()
            
            # 기존 통계에 이미지 관련 정보 추가
            image_stats = {
                'total_size_mb': f"{self.total_size / 1024 / 1024:.2f}MB",
                'max_size_mb': f"{self.max_total_size / 1024 / 1024:.2f}MB",
                'size_utilization': f"{(self.total_size / self.max_total_size * 100):.1f}%",
                'items_age_stats': {
                    'min': min((current_time - item.timestamp for item in self.cache.values()), default=0),
                    'max': max((current_time - item.timestamp for item in self.cache.values()), default=0),
                    'avg': sum((current_time - item.timestamp for item in self.cache.values()), default=0) / len(self.cache) if self.cache else 0
                }
            }
            
            stats.update(image_stats)
            return stats
            
        except Exception as e:
            logger.error(f"이미지 캐시 통계 수집 중 오류: {str(e)}")
            return {}            


class ErrorSeverity(Enum):
    LOW = "낮음"
    MEDIUM = "중간"
    HIGH = "높음"
    CRITICAL = "심각"

class ErrorHandler:
    def __init__(self, main_window):
        self.main_window = main_window
        self.log_dir = QStandardPaths.writableLocation(QStandardPaths.StandardLocation.AppDataLocation)
        os.makedirs(self.log_dir, exist_ok=True)
        
    def handle_error(self, error_msg, severity=ErrorSeverity.MEDIUM, exception=None):
        """향상된 에러 처리 및 사용자 안내"""
        try:
            # 1. 에러 로깅
            self.log_error(error_msg, severity, exception)
            
            # 2. 심각도에 따른 처리
            if severity == ErrorSeverity.LOW:
                # 상태바에 간단한 알림 표시
                self.main_window.statusBar().showMessage(f"알림: {error_msg}", 5000)
                
            elif severity == ErrorSeverity.MEDIUM:
                # 경고 대화상자와 해결 방법 제시
                QMessageBox.warning(
                    self.main_window,
                    '경고',
                    f"{error_msg}\n\n"
                    f"문제 해결 방법:\n"
                    f"1. 프로그램을 다시 시작해보세요.\n"
                    f"2. 임시 파일을 정리해보세요.\n"
                    f"3. 설정을 초기화해보세요.\n"
                    f"4. 문제가 지속되면 로그를 확인해주세요."
                )
                
            elif severity == ErrorSeverity.HIGH:
                # 심각한 오류 알림과 저장 권장
                QMessageBox.critical(
                    self.main_window,
                    '심각한 오류',
                    f"심각한 오류가 발생했습니다:\n{error_msg}\n\n"
                    f"작업 내용을 저장하고 프로그램을 다시 시작하는 것을 권장합니다.\n"
                    f"로그 파일에 자세한 오류 정보가 기록되었습니다."
                )
                
            elif severity == ErrorSeverity.CRITICAL:
                # 치명적 오류 시 강제 저장 및 종료 제안
                reply = QMessageBox.critical(
                    self.main_window,
                    '치명적 오류',
                    f"치명적인 오류가 발생했습니다:\n{error_msg}\n\n"
                    f"프로그램을 안전하게 종료하시겠습니까?\n"
                    f"현재 작업이 자동으로 저장됩니다.",
                    QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
                    QMessageBox.StandardButton.Yes
                )
                
                if reply == QMessageBox.StandardButton.Yes:
                    try:
                        # 작업 내용 자동 저장 시도
                        if hasattr(self.main_window, 'save_settings'):
                            self.main_window.save_settings()
                        # 리소스 정리
                        if hasattr(self.main_window, 'resource_manager'):
                            self.main_window.resource_manager.cleanup()
                        self.main_window.close()
                    except Exception as e:
                        QMessageBox.critical(
                            self.main_window,
                            '긴급 종료',
                            f"자동 저장 중 추가 오류가 발생했습니다.\n"
                            f"프로그램을 즉시 종료합니다.\n"
                            f"오류: {str(e)}"
                        )
                        self.main_window.close()
                        
        except Exception as e:
            # 에러 핸들러 자체의 오류 처리
            print(f"Error handler failed: {str(e)}")
            QMessageBox.critical(
                self.main_window,
                '시스템 오류',
                '오류 처리 중 추가 문제가 발생했습니다.\n'
                '프로그램을 재시작해주세요.\n'
                f'상세 오류: {str(e)}'
            )
    
    def log_error(self, error_msg, severity, exception=None):
        """상세한 에러 로깅"""
        try:
            log_file = os.path.join(self.log_dir, 'error.log')
            with open(log_file, 'a', encoding='utf-8') as f:
                # 타임스탬프와 기본 정보 기록
                timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                f.write(f"\n[{timestamp}] {severity.value} - {error_msg}\n")
                
                # 예외 정보가 있으면 상세 정보 기록
                if exception:
                    f.write(f"Exception type: {type(exception).__name__}\n")
                    f.write(f"Exception message: {str(exception)}\n")
                    f.write("Traceback:\n")
                    f.write(traceback.format_exc())
                
                # 시스템 정보 기록
                f.write("\nSystem Info:\n")
                f.write(f"OS: {sys.platform}\n")
                f.write(f"Python version: {sys.version}\n")
                
                f.write("-" * 80 + "\n")
                
        except Exception as e:
            print(f"로그 기록 실패: {str(e)}")


class ResourceManager:
    def __init__(self, main_window):
        self.main_window = main_window
        self.resources = []
        self.cleanup_handlers = []
        
        
    def register_resource(self, resource, cleanup_handler=None):
        """리소스 등록"""
        self.resources.append(resource)
        if cleanup_handler:
            self.cleanup_handlers.append(cleanup_handler)
            
    def cleanup(self):
        """리소스 정리"""
        try:
            # 1. 먼저 타이머 정리
            if hasattr(self.main_window, 'preview_timer'):
                self.main_window.preview_timer.stop()
                self.main_window.preview_timer.deleteLater()
                
            if hasattr(self.main_window, 'auto_save_timer'):
                self.main_window.auto_save_timer.stop()
                self.main_window.auto_save_timer.deleteLater()
            
            # 2. 설정 저장
            if hasattr(self.main_window, 'text_settings_manager'):
                self.main_window.text_settings_manager.save_settings()
                
            if hasattr(self.main_window, 'preset_manager'):
                self.main_window.preset_manager.save_presets()
            
            # 3. 캐시 정리
            if hasattr(self.main_window, 'image_cache'):
                self.main_window.image_cache.save_mappings()
            
            # 4. 임시 파일 정리
            if hasattr(self.main_window, 'card_handler'):
                self.main_window.card_handler.cleanup()
            
            # 5. 등록된 리소스 정리
            for resource, handler in zip(self.resources, self.cleanup_handlers):
                if handler:
                    try:
                        handler(resource)
                    except Exception as e:
                        print(f"리소스 정리 중 오류 발생: {str(e)}")
            
            # 6. 위젯 정리
            for widget in self.main_window.findChildren(QWidget):
                try:
                    widget.deleteLater()
                except Exception as e:
                    print(f"위젯 정리 중 오류 발생: {str(e)}")
                    
            return True
            
        except Exception as e:
            print(f"리소스 정리 중 오류 발생: {str(e)}")
            return False


class TemplateManager:
    def __init__(self, main_window):
       self.main_window = main_window
       self.current_template = None

       self.templates = {
           "커스텀": {
               "name": "커스텀",
               "theme": {
                   "colors": {
                       "outer_box": "#ffffff",
                       "inner_box": "#f8f9fa",
                       "background": "#f8f9fa",
                       "bot_name": "#4a4a4a",
                       "dialog": "#2d3748",
                       "narration": "#4a5568",
                       "inner_thoughts": "#718096",
                       "profile_border": "#e2e8f0",
                       "box_border": "#e2e8f0",
                       "image_border": "#e2e8f0",
                       "divider_outer": "#e2e8f0",
                       "divider_inner": "#ffffff",
                       "gradient_start": "#f8f9fa",
                       "gradient_end": "#ffffff"
                   },
                   "tags": [
                       {"color": "#edf2f7", "text_color": "#2d3748", "border_color": "#e2e8f0"},
                       {"color": "#e2e8f0", "text_color": "#2d3748", "border_color": "#cbd5e0"},
                       {"color": "#cbd5e0", "text_color": "#2d3748", "border_color": "#a0aec0"}
                   ]
               }
           },
           "모던 블루": {
               "name": "모던 블루",
               "theme": {
                   "colors": {
                       "outer_box": "#1a202c",
                       "inner_box": "#2d3748",
                       "background": "#2d3748",
                       "bot_name": "#90cdf4",
                       "dialog": "#f7fafc",
                       "narration": "#e2e8f0",
                       "inner_thoughts": "#cbd5e0",
                       "profile_border": "#4a5568",
                       "box_border": "#4a5568",
                       "image_border": "#4a5568",
                       "divider_outer": "#4a5568",
                       "divider_inner": "#2d3748",
                       "gradient_start": "#1a202c",
                       "gradient_end": "#2d3748"
                   },
                   "tags": [
                       {"color": "#2c5282", "text_color": "#bee3f8", "border_color": "#2b6cb0"},
                       {"color": "#2b6cb0", "text_color": "#bee3f8", "border_color": "#3182ce"},
                       {"color": "#3182ce", "text_color": "#ffffff", "border_color": "#4299e1"}
                   ]
               }
           },
           "다크 모드": {
               "name": "다크 모드",
               "theme": {
                   "colors": {
                       "outer_box": "#000000",
                       "inner_box": "#1a1a1a",
                       "background": "#1a1a1a",
                       "bot_name": "#ffffff",
                       "dialog": "#ffffff",
                       "narration": "#e0e0e0",
                       "inner_thoughts": "#c0c0c0",
                       "profile_border": "#333333",
                       "box_border": "#333333",
                       "image_border": "#333333",
                       "divider_outer": "#333333",
                       "divider_inner": "#1a1a1a",
                       "gradient_start": "#000000",
                       "gradient_end": "#1a1a1a"
                   },
                   "tags": [
                       {"color": "#262626", "text_color": "#e0e0e0", "border_color": "#333333"},
                       {"color": "#333333", "text_color": "#e0e0e0", "border_color": "#404040"},
                       {"color": "#404040", "text_color": "#ffffff", "border_color": "#4d4d4d"}
                   ]
               }
           },
           "로즈 골드": {
               "name": "로즈 골드",
               "theme": {
                   "colors": {
                       "outer_box": "#ffffff",
                       "inner_box": "#fff5f5",
                       "background": "#fff5f5",
                       "bot_name": "#c53030",
                       "dialog": "#2d3748",
                       "narration": "#4a5568",
                       "inner_thoughts": "#718096",
                       "profile_border": "#feb2b2",
                       "box_border": "#fc8181",
                       "image_border": "#feb2b2",
                       "divider_outer": "#fc8181",
                       "divider_inner": "#ffffff",
                       "gradient_start": "#fff5f5",
                       "gradient_end": "#fed7d7"
                   },
                   "tags": [
                       {"color": "#fed7d7", "text_color": "#c53030", "border_color": "#feb2b2"},
                       {"color": "#feb2b2", "text_color": "#c53030", "border_color": "#fc8181"},
                       {"color": "#fc8181", "text_color": "#ffffff", "border_color": "#f56565"}
                   ]
               }
           },
           "민트 그린": {
               "name": "민트 그린",
               "theme": {
                   "colors": {
                       "outer_box": "#ffffff",
                       "inner_box": "#f0fff4",
                       "background": "#f0fff4",
                       "bot_name": "#2f855a",
                       "dialog": "#2d3748",
                       "narration": "#4a5568",
                       "inner_thoughts": "#718096",
                       "profile_border": "#9ae6b4",
                       "box_border": "#68d391",
                       "image_border": "#9ae6b4",
                       "divider_outer": "#68d391",
                       "divider_inner": "#ffffff",
                       "gradient_start": "#f0fff4",
                       "gradient_end": "#c6f6d5"
                   },
                   "tags": [
                       {"color": "#c6f6d5", "text_color": "#2f855a", "border_color": "#9ae6b4"},
                       {"color": "#9ae6b4", "text_color": "#2f855a", "border_color": "#68d391"},
                       {"color": "#68d391", "text_color": "#ffffff", "border_color": "#48bb78"}
                   ]
               }
           },
           "모던 퍼플": {
               "name": "모던 퍼플",
               "theme": {
                   "colors": {
                       "outer_box": "#ffffff",
                       "inner_box": "#f8f5ff",
                       "background": "#f8f5ff",
                       "bot_name": "#6b46c1",
                       "dialog": "#2d3748",
                       "narration": "#4a5568",
                       "inner_thoughts": "#718096",
                       "profile_border": "#d6bcfa",
                       "box_border": "#b794f4",
                       "image_border": "#d6bcfa",
                       "divider_outer": "#b794f4",
                       "divider_inner": "#ffffff",
                       "gradient_start": "#f8f5ff",
                       "gradient_end": "#e9d8fd"
                   },
                   "tags": [
                       {"color": "#e9d8fd", "text_color": "#6b46c1", "border_color": "#d6bcfa"},
                       {"color": "#d6bcfa", "text_color": "#6b46c1", "border_color": "#b794f4"},
                       {"color": "#b794f4", "text_color": "#ffffff", "border_color": "#9f7aea"}
                   ]
               }
           },
           "오션 블루": {
               "name": "오션 블루",
               "theme": {
                   "colors": {
                       "outer_box": "#ffffff",
                       "inner_box": "#ebf8ff",
                       "background": "#ebf8ff",
                       "bot_name": "#2c5282",
                       "dialog": "#2d3748",
                       "narration": "#4a5568",
                       "inner_thoughts": "#718096",
                       "profile_border": "#90cdf4",
                       "box_border": "#63b3ed",
                       "image_border": "#90cdf4",
                       "divider_outer": "#63b3ed",
                       "divider_inner": "#ffffff",
                       "gradient_start": "#ebf8ff",
                       "gradient_end": "#bee3f8"
                   },
                   "tags": [
                       {"color": "#bee3f8", "text_color": "#2c5282", "border_color": "#90cdf4"},
                       {"color": "#90cdf4", "text_color": "#2c5282", "border_color": "#63b3ed"},
                       {"color": "#63b3ed", "text_color": "#ffffff", "border_color": "#4299e1"}
                   ]
               }
           },
           "선셋 오렌지": {
               "name": "선셋 오렌지",
               "theme": {
                   "colors": {
                       "outer_box": "#ffffff",
                       "inner_box": "#fffaf0",
                       "background": "#fffaf0",
                       "bot_name": "#c05621",
                       "dialog": "#2d3748",
                       "narration": "#4a5568",
                       "inner_thoughts": "#718096",
                       "profile_border": "#fbd38d",
                       "box_border": "#f6ad55",
                       "image_border": "#fbd38d",
                       "divider_outer": "#f6ad55",
                       "divider_inner": "#ffffff",
                       "gradient_start": "#fffaf0",
                       "gradient_end": "#feebc8"
                   },
                   "tags": [
                       {"color": "#feebc8", "text_color": "#c05621", "border_color": "#fbd38d"},
                       {"color": "#fbd38d", "text_color": "#c05621", "border_color": "#f6ad55"},
                       {"color": "#f6ad55", "text_color": "#ffffff", "border_color": "#ed8936"}
                   ]
               }
           },
           "모카 브라운": {
               "name": "모카 브라운",
               "theme": {
                   "colors": {
                       "outer_box": "#ffffff",
                       "inner_box": "#faf5f1",
                       "background": "#faf5f1",
                       "bot_name": "#7b341e",
                       "dialog": "#2d3748",
                       "narration": "#4a5568",
                       "inner_thoughts": "#718096",
                       "profile_border": "#d6bcab",
                       "box_border": "#b08b6e",
                       "image_border": "#d6bcab",
                       "divider_outer": "#b08b6e",
                       "divider_inner": "#ffffff",
                       "gradient_start": "#faf5f1",
                       "gradient_end": "#e8d6cf"
                   },
                   "tags": [
                       {"color": "#e8d6cf", "text_color": "#7b341e", "border_color": "#d6bcab"},
                       {"color": "#d6bcab", "text_color": "#7b341e", "border_color": "#b08b6e"},
                       {"color": "#b08b6e", "text_color": "#ffffff", "border_color": "#966251"}
                   ]
               }
           },
           "스페이스 그레이": {
               "name": "스페이스 그레이",
               "theme": {
                   "colors": {
                       "outer_box": "#1a1a1a",
                       "inner_box": "#2d2d2d",
                       "background": "#2d2d2d",
                       "bot_name": "#e2e2e2",
                       "dialog": "#ffffff",
                       "narration": "#d1d1d1",
                       "inner_thoughts": "#b0b0b0",
                       "profile_border": "#404040",
                       "box_border": "#404040",
                       "image_border": "#404040",
                       "divider_outer": "#404040",
                       "divider_inner": "#2d2d2d",
                       "gradient_start": "#1a1a1a",
                       "gradient_end": "#2d2d2d"
                   },
                   "tags": [
                       {"color": "#404040", "text_color": "#e2e2e2", "border_color": "#4a4a4a"},
                       {"color": "#4a4a4a", "text_color": "#e2e2e2", "border_color": "#525252"},
                       {"color": "#525252", "text_color": "#ffffff", "border_color": "#5a5a5a"}
                   ]
               }
           },
           "그라데이션 모던": {
               "name": "그라데이션 모던",
               "theme": {
                   "colors": {
                       "outer_box": "#fafafa",
                       "inner_box": "#fafafa",
                       "background": "#fafafa",
                       "bot_name": "#494949",
                       "dialog": "#494949",
                       "narration": "#666666",
                       "inner_thoughts": "#808080",
                       "profile_border": "#e3e3e3",
                       "box_border": "#e9e9e9",
                       "image_border": "#e3e3e3",
                       "divider_outer": "#e9e9e9",
                       "divider_inner": "#e9e9e9",
                       "gradient_start": "#D9D782",
                       "gradient_end": "#A9B9D9",
                       "tag_bg": "#494949",
                       "tag_text": "#d5d5d5"
                   },
                   "tags": [
                       {"color": "#494949", "text_color": "#d5d5d5", "border_color": "#5a5a5a"},
                       {"color": "#494949", "text_color": "#d5d5d5", "border_color": "#5a5a5a"},
                       {"color": "#494949", "text_color": "#d5d5d5", "border_color": "#5a5a5a"}
                   ]
               }
           }
       }


    def get_template_names(self):
        """템플릿 이름 목록 반환"""
        try:
            names = list(self.templates.keys())
            # "커스텀"을 항상 첫 번째로
            if "커스텀" in names:
                names.remove("커스텀")
                names.sort()
                names.insert(0, "커스텀")
            return names
        except Exception as e:
            print(f"템플릿 이름 가져오기 오류: {str(e)}")
            return ["커스텀"]

    def apply_template(self, template_name):
        """템플릿 적용"""
        try:
            if template_name not in self.templates:
                print(f"Template not found: {template_name}")
                return False

            template = self.templates[template_name]["theme"]["colors"]
            
            # 색상 설정 적용
            self.main_window.outer_box_color.setColor(template["outer_box"])
            self.main_window.inner_box_color.setColor(template["inner_box"])
            self.main_window.bot_name_color.setColor(template["bot_name"])
            self.main_window.dialog_color.setColor(template["dialog"])
            self.main_window.narration_color.setColor(template["narration"])
            self.main_window.profile_border_color.setColor(template["profile_border"])
            self.main_window.divider_outer_color.setColor(template["divider_outer"])
            self.main_window.divider_inner_color.setColor(template["divider_inner"])
            
            # 새로 추가된 색상 설정 적용
            if hasattr(self.main_window, 'inner_thoughts_color'):
                self.main_window.inner_thoughts_color.setColor(template["inner_thoughts"])
            if hasattr(self.main_window, 'box_border_color'):
                self.main_window.box_border_color.setColor(template["box_border"])
            if hasattr(self.main_window, 'image_border_color'):
                self.main_window.image_border_color.setColor(template["image_border"])

            # 태그 색상 및 스타일 적용
            tags = self.templates[template_name]["theme"]["tags"]
            for i, tag_data in enumerate(tags):
                if i < len(self.main_window.tag_colors):
                    self.main_window.tag_colors[i].setColor(tag_data["color"])

                    # 태그 입력 위젯이 있는 경우 추가 스타일 적용
                    tag_entries = self.main_window.findChildren(TagEntry)
                    if i < len(tag_entries):
                        tag_entries[i].text_color_btn.setColor(tag_data["text_color"])
                        if "border_color" in tag_data:
                            tag_entries[i].border_color = tag_data["border_color"]
                        if "hover_color" in tag_data:
                            tag_entries[i].hover_color = tag_data["hover_color"]

            # 메인 윈도우의 미리보기 업데이트
            self.main_window.update_preview()
            
            return True

        except Exception as e:
            print(f"템플릿 적용 중 오류: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

    def get_shadow_intensity(self, template_name):
        """그림자 강도값 반환"""
        return STYLES['shadow_intensity']


class TextSettingsManager:
    def __init__(self, main_window):
        self.main_window = main_window
        self.settings_file = os.path.join(
            QStandardPaths.writableLocation(QStandardPaths.StandardLocation.AppDataLocation),
            'text_settings.json'
        )
        os.makedirs(os.path.dirname(self.settings_file), exist_ok=True)
        self.settings = {}
        self.load_settings()

    def load_settings(self):
        """저장된 텍스트 설정 불러오기"""
        try:
            if os.path.exists(self.settings_file):
                with open(self.settings_file, 'r', encoding='utf-8') as f:
                    self.settings = json.load(f)
        except Exception as e:
            print(f"텍스트 설정 로드 중 오류 발생: {e}")
            self.settings = {}

    def save_settings(self):
        """텍스트 설정을 파일에 저장"""
        try:
            with open(self.settings_file, 'w', encoding='utf-8') as f:
                json.dump(self.settings, f, ensure_ascii=False, indent=2)
        except Exception as e:
            QMessageBox.warning(
                self.main_window,
                '오류',
                f'텍스트 설정 저장 중 오류가 발생했습니다: {str(e)}'
            )

    def save_current_settings(self):
        """현재 텍스트 설정을 저장"""
        name, ok = QInputDialog.getText(
            self.main_window, '텍스트 설정 저장', '설정 이름을 입력하세요:'
        )
        if ok and name:
            if name in self.settings:
                reply = QMessageBox.question(
                    self.main_window,
                    '설정 덮어쓰기',
                    f'"{name}" 설정이 이미 존재합니다. 덮어쓰시겠습니까?',
                    QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
                )
                if reply == QMessageBox.StandardButton.No:
                    return
            try:
                # 현재 설정 수집
                current_settings = {
                    'text_indent': self.main_window.text_indent.value(),
                    'dialog_color': self.main_window.dialog_color.get_color(),
                    'narration_color': self.main_window.narration_color.get_color(),
                    'inner_thoughts_color': self.main_window.inner_thoughts_color.get_color(),
                    'dialog_bold': self.main_window.dialog_bold.isChecked(),
                    'dialog_newline': self.main_window.dialog_newline.isChecked(),  # 대화문 줄바꿈 설정 추가
                    'inner_thoughts_bold': self.main_window.inner_thoughts_bold.isChecked(),
                    'remove_asterisk': self.main_window.remove_asterisk.isChecked(),
                    'convert_ellipsis': self.main_window.convert_ellipsis.isChecked(),
                    'use_text_size': self.main_window.use_text_size.isChecked(),
                    'text_size': self.main_window.text_size.value(),
                    'use_text_indent': self.main_window.use_text_indent.isChecked()
                }
                self.settings[name] = current_settings
                self.save_settings()
                QMessageBox.information(
                    self.main_window,
                    '저장 완료',
                    f'텍스트 설정 "{name}"이(가) 저장되었습니다.'
                )
            except Exception as e:
                QMessageBox.warning(
                    self.main_window,
                    '오류',
                    f'설정 저장 중 오류가 발생했습니다: {str(e)}'
                )

    def load_settings_by_name(self, name):
        """저장된 텍스트 설정 불러오기"""
        try:
            if name not in self.settings:
                QMessageBox.warning(
                    self.main_window,
                    '오류',
                    f'설정 "{name}"을(를) 찾을 수 없습니다.'
                )
                return False

            settings = self.settings[name]
            
            # 설정 적용
            self.main_window.text_indent.setValue(settings['text_indent'])
            self.main_window.dialog_color.setColor(settings['dialog_color'])
            self.main_window.narration_color.setColor(settings['narration_color'])
            self.main_window.inner_thoughts_color.setColor(settings.get('inner_thoughts_color', '#718096'))
            self.main_window.dialog_bold.setChecked(settings['dialog_bold'])
            self.main_window.dialog_newline.setChecked(settings.get('dialog_newline', True))  # 대화문 줄바꿈 설정 로드
            self.main_window.inner_thoughts_bold.setChecked(settings.get('inner_thoughts_bold', False))
            self.main_window.remove_asterisk.setChecked(settings['remove_asterisk'])
            self.main_window.convert_ellipsis.setChecked(settings['convert_ellipsis'])
            self.main_window.use_text_size.setChecked(settings['use_text_size'])
            self.main_window.text_size.setValue(settings['text_size'])
            self.main_window.use_text_indent.setChecked(settings['use_text_indent'])

            # UI 상태 업데이트
            self.main_window.update_text_size_state()
            self.main_window.update_indent_state()
            self.main_window.update_preview()

            QMessageBox.information(
                self.main_window,
                '불러오기 완료',
                f'텍스트 설정 "{name}"이(가) 적용되었습니다.'
            )
            return True

        except Exception as e:
            QMessageBox.warning(
                self.main_window,
                '오류',
                f'설정을 불러오는 중 오류가 발생했습니다: {str(e)}'
            )
            return False

    def delete_settings(self, name):
        """저장된 텍스트 설정 삭제"""
        try:
            if name in self.settings:
                reply = QMessageBox.question(
                    self.main_window,
                    '설정 삭제',
                    f'"{name}" 설정을 삭제하시겠습니까?',
                    QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
                )
                
                if reply == QMessageBox.StandardButton.Yes:
                    del self.settings[name]
                    self.save_settings()
                    QMessageBox.information(
                        self.main_window,
                        '삭제 완료',
                        f'텍스트 설정 "{name}"이(가) 삭제되었습니다.'
                    )
                    return True
        except Exception as e:
            QMessageBox.warning(
                self.main_window,
                '오류',
                f'설정 삭제 중 오류가 발생했습니다: {str(e)}'
            )
        return False


class ProfileManager:
    def __init__(self, main_window):
        self.main_window = main_window
        self.profiles_file = os.path.join(
            QStandardPaths.writableLocation(QStandardPaths.StandardLocation.AppDataLocation),
            'profile_sets'
        )
        os.makedirs(os.path.dirname(self.profiles_file), exist_ok=True)

    def save_profile_set(self, name):
        """현재 프로필 설정을 저장"""
        try:
            # 프로필 데이터 수집
            profile_data = {
                'bot_name': self.main_window.bot_name.text(),
                'bot_name_color': self.main_window.bot_name_color.get_color(),
                'show_profile': self.main_window.show_profile.isChecked(),
                'show_profile_image': self.main_window.show_profile_image.isChecked(),
                'show_bot_name': self.main_window.show_bot_name.isChecked(),
                'show_tags': self.main_window.show_tags.isChecked(),
                'show_divider': self.main_window.show_divider.isChecked(),
                'frame_style': self.main_window.frame_style.currentText(),
                'image_url': self.main_window.image_url.text(),
                'profile_border_color': self.main_window.profile_border_color.get_color(),
                'show_profile_border': self.main_window.show_profile_border.isChecked(),
                'show_profile_shadow': self.main_window.show_profile_shadow.isChecked(),
                'width': self.main_window.width_input.value(),
                'height': self.main_window.height_input.value(),
                'divider_style': self.main_window.divider_style.currentText(),
                'divider_thickness': self.main_window.divider_thickness.value(),
                'divider_outer_color': self.main_window.divider_outer_color.get_color(),
                'divider_inner_color': self.main_window.divider_inner_color.get_color(),
                'divider_solid_color': self.main_window.divider_solid_color.get_color()
            }
            
            # 프로필 세트 저장
            file_path = f"{self.profiles_file}_{name}.json"
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(profile_data, f, ensure_ascii=False, indent=2)
            return True, f"프로필 세트 '{name}'이(가) 저장되었습니다."
        except Exception as e:
            return False, f"프로필 저장 중 오류 발생: {str(e)}"

    def load_profile_set(self, name):
        """저장된 프로필 세트 불러오기"""
        try:
            file_path = f"{self.profiles_file}_{name}.json"
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"프로필 파일을 찾을 수 없습니다: {name}")
                
            with open(file_path, 'r', encoding='utf-8') as f:
                profile_data = json.load(f)
                
            # 기존 프로필 데이터 로드
            self.main_window.bot_name.setText(profile_data.get('bot_name', ''))
            self.main_window.bot_name_color.setColor(profile_data.get('bot_name_color', '#4a4a4a'))
            self.main_window.show_profile.setChecked(profile_data.get('show_profile', True))
            self.main_window.show_profile_image.setChecked(profile_data.get('show_profile_image', True))
            self.main_window.show_bot_name.setChecked(profile_data.get('show_bot_name', True))
            self.main_window.show_tags.setChecked(profile_data.get('show_tags', True))
            self.main_window.show_divider.setChecked(profile_data.get('show_divider', True))
            self.main_window.frame_style.setCurrentText(profile_data.get('frame_style', '동그라미'))
            self.main_window.image_url.setText(profile_data.get('image_url', ''))
            self.main_window.profile_border_color.setColor(profile_data.get('profile_border_color', '#ffffff'))
            self.main_window.show_profile_border.setChecked(profile_data.get('show_profile_border', True))
            self.main_window.show_profile_shadow.setChecked(profile_data.get('show_profile_shadow', True))
            self.main_window.width_input.setValue(profile_data.get('width', 80))
            self.main_window.height_input.setValue(profile_data.get('height', 80))

            # 구분선 설정 로드
            self.main_window.divider_style.setCurrentText(profile_data.get('divider_style', '그라데이션'))
            self.main_window.divider_thickness.setValue(profile_data.get('divider_thickness', 1))
            self.main_window.divider_outer_color.setColor(profile_data.get('divider_outer_color', STYLES['divider_outer_color']))
            self.main_window.divider_inner_color.setColor(profile_data.get('divider_inner_color', STYLES['divider_inner_color']))
            self.main_window.divider_solid_color.setColor(profile_data.get('divider_solid_color', STYLES['divider_outer_color']))

            # UI 상태 업데이트
            self.main_window.update_profile_element_states()
            self.main_window.update_size_inputs(self.main_window.frame_style.currentText())
            self.main_window.update_profile_style_states()
            self.main_window.toggle_divider_color_settings(self.main_window.divider_style.currentText())
            self.main_window.update_preview()
            
            return True, f"프로필 세트 '{name}'을(를) 불러왔습니다."
            
        except Exception as e:
            return False, f"프로필 불러오기 중 오류 발생: {str(e)}"


    def delete_profile_set(self, name):
        """저장된 프로필 세트 삭제"""
        try:
            file_path = f"{self.profiles_file}_{name}.json"
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"프로필 파일을 찾을 수 없습니다: {name}")

            os.remove(file_path)
            return True, f"프로필 세트 '{name}'이(가) 삭제되었습니다."
        except Exception as e:
            return False, f"프로필 삭제 중 오류 발생: {str(e)}"

    def get_available_profile_sets(self):
        """저장된 프로필 세트 목록 반환"""
        try:
            profile_files = glob.glob(f"{self.profiles_file}_*.json")
            return [os.path.basename(f)[len(os.path.basename(self.profiles_file)) + 1:-5] 
                   for f in profile_files]
        except Exception:
            return []
    
    def save_profile_set_dialog(self):
        """프로필 세트 저장 다이얼로그"""
        name, ok = QInputDialog.getText(
            self.main_window, '프로필 세트 저장', '저장할 프로필 세트의 이름을 입력하세요:'
        )
        if ok and name:
            # 중복 확인
            if f"{self.profiles_file}_{name}.json" in glob.glob(f"{self.profiles_file}_*.json"):
                reply = QMessageBox.question(
                    self.main_window,
                    '프로필 덮어쓰기',
                    f'"{name}" 프로필이 이미 존재합니다. 덮어쓰시겠습니까?',
                    QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
                )
                if reply == QMessageBox.StandardButton.No:
                    return
            
            success, message = self.save_profile_set(name)
            QMessageBox.information(self.main_window, "프로필 저장", message)

    def load_profile_set_dialog(self):
        """프로필 세트 불러오기 다이얼로그"""
        available_sets = self.get_available_profile_sets()
        if not available_sets:
            QMessageBox.information(self.main_window, "프로필 불러오기", "저장된 프로필 세트가 없습니다.")
            return
        
        name, ok = QInputDialog.getItem(
            self.main_window,
            "프로필 불러오기",
            "불러올 프로필 세트를 선택하세요:",
            available_sets,
            0,
            False
        )
        
        if ok and name:
            success, message = self.load_profile_set(name)
            QMessageBox.information(self.main_window, "프로필 불러오기", message)

    def delete_profile_set_dialog(self):
        """프로필 세트 삭제 다이얼로그"""
        available_sets = self.get_available_profile_sets()
        if not available_sets:
            QMessageBox.information(self.main_window, "프로필 삭제", "저장된 프로필 세트가 없습니다.")
            return
        
        name, ok = QInputDialog.getItem(
            self.main_window,
            "프로필 삭제",
            "삭제할 프로필 세트를 선택하세요:",
            available_sets,
            0,
            False
        )
        
        if ok and name:
            reply = QMessageBox.question(
                self.main_window,
                "프로필 삭제 확인",
                f"프로필 세트 '{name}'을(를) 정말 삭제하시겠습니까?",
                QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
            )
            
            if reply == QMessageBox.StandardButton.Yes:
                success, message = self.delete_profile_set(name)
                QMessageBox.information(self.main_window, "프로필 삭제", message)


class WordReplaceManager:
    def __init__(self, main_window):
        self.main_window = main_window
        self.word_sets_file = os.path.join(
            QStandardPaths.writableLocation(QStandardPaths.StandardLocation.AppDataLocation),
            'word_replace_sets'
        )
        os.makedirs(os.path.dirname(self.word_sets_file), exist_ok=True)

    def save_word_set(self, name):
        """현재 단어 변경 설정을 저장"""
        try:
            # 단어 변경 데이터 수집
            word_pairs = []
            for entry in self.main_window.word_replace_container.findChildren(WordReplaceEntry):
                from_word = entry.from_word.text().strip()
                to_word = entry.to_word.text().strip()
                if from_word or to_word:  # 둘 중 하나라도 있으면 저장
                    word_pairs.append({
                        'from': from_word,
                        'to': to_word
                    })

            if not word_pairs:
                raise ValueError("저장할 단어 변경 설정이 없습니다.")

            # 단어 변경 세트 저장
            file_path = f"{self.word_sets_file}_{name}.json"
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(word_pairs, f, ensure_ascii=False, indent=2)

            return True, f"단어 변경 세트 '{name}'이(가) 저장되었습니다."
            
        except Exception as e:
            return False, f"단어 변경 세트 저장 중 오류 발생: {str(e)}"

    def load_word_set(self, name):
        """저장된 단어 변경 세트 불러오기"""
        try:
            file_path = f"{self.word_sets_file}_{name}.json"
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"단어 변경 세트 파일을 찾을 수 없습니다: {name}")

            with open(file_path, 'r', encoding='utf-8') as f:
                word_pairs = json.load(f)

            # 기존 항목 제거
            for i in reversed(range(self.main_window.word_replace_layout.count())):
                widget = self.main_window.word_replace_layout.itemAt(i).widget()
                if widget:
                    widget.deleteLater()

            # 새 항목 추가
            for pair in word_pairs:
                entry = WordReplaceEntry(self.main_window.word_replace_container)
                entry.from_word.setText(pair.get('from', ''))
                entry.to_word.setText(pair.get('to', ''))
                self.main_window.word_replace_layout.addWidget(entry)

            return True, f"단어 변경 세트 '{name}'을(를) 불러왔습니다."
        except Exception as e:
            return False, f"단어 변경 세트 불러오기 중 오류 발생: {str(e)}"

    def delete_word_set(self, name):
        """저장된 단어 변경 세트 삭제"""
        try:
            file_path = f"{self.word_sets_file}_{name}.json"
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"단어 변경 세트 파일을 찾을 수 없습니다: {name}")

            os.remove(file_path)
            return True, f"단어 변경 세트 '{name}'이(가) 삭제되었습니다."
        except Exception as e:
            return False, f"단어 변경 세트 삭제 중 오류 발생: {str(e)}"

    def get_available_word_sets(self):
        """저장된 단어 변경 세트 목록 반환"""
        try:
            word_files = glob.glob(f"{self.word_sets_file}_*.json")
            return [os.path.basename(f)[len(os.path.basename(self.word_sets_file)) + 1:-5] 
                   for f in word_files]
        except Exception:
            return []
    
    def save_word_set_dialog(self):
        """단어 변경 세트 저장 다이얼로그"""
        name, ok = QInputDialog.getText(
            self.main_window, '단어 변경 세트 저장', '저장할 단어 변경 세트의 이름을 입력하세요:'
        )
        if ok and name:
            # 중복 확인
            word_set_file = f"{self.word_sets_file}_{name}.json"
            if os.path.exists(word_set_file):
                reply = QMessageBox.question(
                    self.main_window,
                    '단어 변경 덮어쓰기',
                    f'"{name}" 단어 변경 세트가 이미 존재합니다. 덮어쓰시겠습니까?',
                    QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
                )
                if reply == QMessageBox.StandardButton.No:
                    return
                    
            success, message = self.save_word_set(name)
            QMessageBox.information(self.main_window, "단어 변경 저장", message)

    def load_word_set_dialog(self):
        """단어 변경 세트 불러오기 다이얼로그"""
        available_sets = self.get_available_word_sets()
        if not available_sets:
            QMessageBox.information(
                self.main_window, 
                "단어 변경 세트 불러오기", 
                "저장된 단어 변경 세트가 없습니다."
            )
            return
        
        name, ok = QInputDialog.getItem(
            self.main_window,
            "단어 변경 세트 불러오기",
            "불러올 단어 변경 세트를 선택하세요:",
            available_sets,
            0,
            False
        )
        
        if ok and name:
            success, message = self.load_word_set(name)
            QMessageBox.information(self.main_window, "단어 변경 세트 불러오기", message)

    def delete_word_set_dialog(self):
        """단어 변경 세트 삭제 다이얼로그"""
        available_sets = self.get_available_word_sets()
        if not available_sets:
            QMessageBox.information(
                self.main_window, 
                "단어 변경 세트 삭제", 
                "저장된 단어 변경 세트가 없습니다."
            )
            return
        
        name, ok = QInputDialog.getItem(
            self.main_window,
            "단어 변경 세트 삭제",
            "삭제할 단어 변경 세트를 선택하세요:",
            available_sets,
            0,
            False
        )
        
        if ok and name:
            reply = QMessageBox.question(
                self.main_window,
                "단어 변경 세트 삭제 확인",
                f"단어 변경 세트 '{name}'을(를) 정말 삭제하시겠습니까?",
                QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
            )
            
            if reply == QMessageBox.StandardButton.Yes:
                success, message = self.delete_word_set(name)
                QMessageBox.information(self.main_window, "단어 변경 세트 삭제", message)



class ImageCache:
    def __init__(self):
        self.cache_path = QStandardPaths.writableLocation(QStandardPaths.StandardLocation.CacheLocation)
        self.mapping_file = os.path.join(self.cache_path, 'image_mappings.json')
        self.mappings = {}
        self.load_mappings()

    def load_mappings(self):
        try:
            if os.path.exists(self.mapping_file):
                with open(self.mapping_file, 'r', encoding='utf-8') as f:
                    self.mappings = json.load(f)
        except Exception as e:
            print(f"매핑 로드 실패: {e}")
            self.mappings = {}

    def save_mappings(self):
        try:
            os.makedirs(self.cache_path, exist_ok=True)
            with open(self.mapping_file, 'w', encoding='utf-8') as f:
                json.dump(self.mappings, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"매핑 저장 실패: {e}")

class MappingManager:
    def __init__(self, parent):
        self.parent = parent
        self.mappings_file = os.path.join(
            QStandardPaths.writableLocation(QStandardPaths.StandardLocation.AppDataLocation),
            'image_mappings'
        )
        os.makedirs(os.path.dirname(self.mappings_file), exist_ok=True)

    def save_mapping_set(self, name):
        """현재 매핑 세트를 저장"""
        try:
            # 매핑 데이터 수집
            mappings = []
            for entry in self.parent.image_url_container.findChildren(ImageUrlEntry):
                tag = entry.tag_input.text().strip()
                url = entry.url_input.text().strip()
                if tag and url:  # 태그와 URL이 모두 있는 경우만 저장
                    mappings.append({
                        'tag': tag,
                        'url': url
                    })

            if not mappings:
                raise ValueError("저장할 매핑이 없습니다.")

            # 매핑 세트 저장
            file_path = f"{self.mappings_file}_{name}.json"
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(mappings, f, ensure_ascii=False, indent=2)

            return True, f"매핑 세트 '{name}'이(가) 저장되었습니다."
            
        except Exception as e:
            return False, f"매핑 저장 중 오류 발생: {str(e)}"

    def load_mapping_set(self, name):
        """저장된 매핑 세트 불러오기"""
        try:
            file_path = f"{self.mappings_file}_{name}.json"
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"매핑 파일을 찾을 수 없습니다: {name}")

            with open(file_path, 'r', encoding='utf-8') as f:
                mappings = json.load(f)

            # 기존 매핑 제거
            for widget in self.parent.image_url_container.findChildren(ImageUrlEntry):
                widget.deleteLater()

            # 새 매핑 추가
            for mapping in mappings:
                entry = ImageUrlEntry(self.parent.image_url_container)
                entry.from_dict(mapping)
                self.parent.image_url_layout.addWidget(entry)

            return True, f"매핑 세트 '{name}'을(를) 불러왔습니다."
        except Exception as e:
            return False, f"매핑 불러오기 중 오류 발생: {str(e)}"

    def delete_mapping_set(self, name):
        """저장된 매핑 세트 삭제"""
        try:
            file_path = f"{self.mappings_file}_{name}.json"
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"매핑 파일을 찾을 수 없습니다: {name}")

            os.remove(file_path)
            return True, f"매핑 세트 '{name}'이(가) 삭제되었습니다."
        except Exception as e:
            return False, f"매핑 삭제 중 오류 발생: {str(e)}"

    def get_available_mapping_sets(self):
        """저장된 매핑 세트 목록 반환"""
        try:
            mapping_files = glob.glob(f"{self.mappings_file}_*.json")
            return [os.path.basename(f)[len(os.path.basename(self.mappings_file)) + 1:-5] 
                   for f in mapping_files]
        except Exception:
            return []
    
    def save_mapping_set_dialog(self):
        """매핑 세트 저장 다이얼로그"""
        name, ok = QInputDialog.getText(
            self.parent, '매핑 세트 저장', '저장할 매핑 세트의 이름을 입력하세요:'
        )
        if ok and name:
            # 중복 확인
            mapping_file = f"{self.mappings_file}_{name}.json"
            if os.path.exists(mapping_file):
                reply = QMessageBox.question(
                    self.parent,
                    '매핑 덮어쓰기',
                    f'"{name}" 매핑 세트가 이미 존재합니다. 덮어쓰시겠습니까?',
                    QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
                )
                if reply == QMessageBox.StandardButton.No:
                    return
                    
            success, message = self.save_mapping_set(name)
            QMessageBox.information(self.parent, "매핑 저장", message)

    def load_mapping_set_dialog(self):
        """매핑 세트 불러오기 다이얼로그"""
        available_sets = self.get_available_mapping_sets()
        if not available_sets:
            QMessageBox.information(self.parent, "매핑 불러오기", "저장된 매핑 세트가 없습니다.")
            return
        
        name, ok = QInputDialog.getItem(
            self.parent,
            "매핑 불러오기",
            "불러올 매핑 세트를 선택하세요:",
            available_sets,
            0,
            False
        )
        
        if ok and name:
            success, message = self.load_mapping_set(name)
            QMessageBox.information(self.parent, "매핑 불러오기", message)

    def delete_mapping_set_dialog(self):
        """매핑 세트 삭제 다이얼로그"""
        available_sets = self.get_available_mapping_sets()
        if not available_sets:
            QMessageBox.information(self.parent, "매핑 삭제", "저장된 매핑 세트가 없습니다.")
            return
        
        name, ok = QInputDialog.getItem(
            self.parent,
            "매핑 삭제",
            "삭제할 매핑 세트를 선택하세요:",
            available_sets,
            0,
            False
        )
        
        if ok and name:
            reply = QMessageBox.question(
                self.parent,
                "매핑 삭제 확인",
                f"매핑 세트 '{name}'을(를) 정말 삭제하시겠습니까?",
                QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
            )
            
            if reply == QMessageBox.StandardButton.Yes:
                success, message = self.delete_mapping_set(name)
                QMessageBox.information(self.parent, "매핑 삭제", message)


class CharacterCardHandler:
    def __init__(self):
        self.character_data = None
        self.image_data = {}
        self.image_uri_map = {}
        self.assets_folder = os.path.join(
            QStandardPaths.writableLocation(QStandardPaths.StandardLocation.AppDataLocation),
            'temp_assets'
        )
        
        # 임시 폴더 생성
        os.makedirs(self.assets_folder, exist_ok=True)

    def read_character_card(self, file_path):
        """캐릭터 카드 파일 읽기"""
        try:
            if file_path.endswith('.png'):
                self._extract_from_png(file_path)
            elif file_path.endswith('.json'):
                self._extract_from_json(file_path)
            elif file_path.endswith('.charx'):
                self._extract_from_charx(file_path)
            else:
                raise ValueError(f"Unsupported file type: {file_path}")
            
            return True
        except Exception as e:
            print(f"Error reading character card: {e}")
            return False

    def _extract_from_png(self, file_path):
        """PNG 파일에서 데이터 추출"""
        try:
            with open(file_path, 'rb') as f:
                png_signature = f.read(8)
                while True:
                    try:
                        length_bytes = f.read(4)
                        if len(length_bytes) != 4:
                            break
                        
                        length = struct.unpack('>I', length_bytes)[0]
                        chunk_type = f.read(4).decode('ascii')
                        chunk_data = f.read(length)
                        crc = f.read(4)
                        
                        if chunk_type == 'tEXt':
                            keyword_data, text_data = chunk_data.split(b'\x00', 1)
                            keyword = keyword_data.decode('ascii')
                            
                            if keyword in ['ccv3', 'chara']:
                                try:
                                    chara_json_data = base64.b64decode(text_data).decode('utf-8')
                                    self.character_data = json.loads(chara_json_data)
                                    print(f"Character data loaded: {keyword}")
                                except Exception as e:
                                    print(f"Error decoding character data: {e}")
                            else:
                                try:
                                    if '_' in keyword:  # 이미지 데이터를 포함하는 키워드인지 확인
                                        asset_id = keyword.split(':')[-1] if ':' in keyword else '0'
                                        img_key = f"chara-ext-asset_:{asset_id}"
                                        png_data = base64.b64decode(text_data)
                                        self.image_data[img_key] = png_data
                                        print(f"Image data loaded: {img_key}, size: {len(png_data)} bytes")
                                except Exception as e:
                                    print(f"Error processing image data for {keyword}: {e}")
                    except Exception as e:
                        print(f"Error processing PNG chunk: {e}")
                        break
        
            # 데이터 처리 결과 출력
            print(f"Total images found: {len(self.image_data)}")
            self._process_assets()
            return True
        except Exception as e:
            print(f"Error reading PNG file: {e}")
            return False

    def _extract_from_json(self, file_path):
        """JSON 파일에서 데이터 추출"""
        with open(file_path, 'r', encoding='utf-8') as f:
            self.character_data = json.load(f)
        self._process_assets()

    def _extract_from_charx(self, file_path):
        """CHARX 파일에서 데이터 추출"""
        try:
            with zipfile.ZipFile(file_path, 'r') as zip_ref:
                # 캐릭터 카드 데이터 로드
                with zip_ref.open('card.json') as json_file:
                    self.character_data = json.load(json_file)
                
                # 에셋 정보 미리 수집
                assets = self.character_data.get("data", {}).get("assets", [])
                asset_names = {str(i): asset.get("name", f"asset_{i}") 
                            for i, asset in enumerate(assets)}
                
                print(f"\nFound asset mappings in card.json:")
                for idx, name in asset_names.items():
                    print(f"Asset {idx} -> {name}")
                
                # 에셋 파일 처리
                asset_count = 0
                for file_info in zip_ref.infolist():
                    if file_info.filename.startswith('assets/'):
                        try:
                            # 파일 번호 추출 (예: assets/other/0.png -> 0)
                            asset_num = os.path.splitext(os.path.basename(file_info.filename))[0]
                            
                            # card.json의 에셋 이름 사용
                            asset_name = asset_names.get(asset_num, f"asset_{asset_num}")
                            print(f"Processing asset file {file_info.filename} -> {asset_name}")
                            
                            # 이미지 데이터 읽기
                            with zip_ref.open(file_info) as img_file:
                                image_data = img_file.read()
                                # 키 형식을 PNG 파일과 동일하게 맞춤
                                key = f"chara-ext-asset_:{asset_name}"
                                self.image_data[key] = image_data
                                
                                # 이미지 URI 매핑 생성
                                self.image_uri_map[asset_name] = key
                                asset_count += 1
                        except Exception as e:
                            print(f"Error processing asset {file_info.filename}: {e}")
                            continue
                
                print(f"\nExtracted from CHARX:")
                print(f"Total assets found: {asset_count}")
                print(f"Image mappings created: {len(self.image_uri_map)}")
                
                # 디버그 정보 출력
                self.debug_print_asset_info()
                
                return True
        except Exception as e:
            print(f"Error extracting from CHARX: {e}")
            return False

    def _process_assets(self):
        """에셋 데이터 처리"""
        if not self.character_data:
            return
            
        spec = self.character_data.get("spec", "")
        if spec == "chara_card_v2":
            self._process_ccv2_assets()
        elif spec == "chara_card_v3":
            self._process_ccv3_assets()

    def _process_ccv2_assets(self):
        """CCv2 에셋 처리"""
        try:
            extensions = self.character_data.get("data", {}).get("extensions", {})
            risuai = extensions.get("risuai", {})
            additional_assets = risuai.get("additionalAssets", [])
            
            for asset in additional_assets:
                asset_name, asset_uri, _ = asset
                asset_name = re.sub(r'\.(png|jpg|webp)$', '', asset_name, flags=re.I)
                asset_number = asset_uri.split(':')[1]
                self.image_uri_map[asset_name] = f"chara-ext-asset_{asset_number.strip()}.png"
        except Exception as e:
            print(f"Error processing CCv2 assets: {e}")

    # CharacterCardHandler 클래스의 _process_ccv3_assets 메서드를 수정합니다
    def _process_ccv3_assets(self):
        """CCv3 에셋 처리"""
        try:
            print("\nProcessing CCv3 assets...")
            assets = self.character_data.get("data", {}).get("assets", [])
            print(f"Found {len(assets)} assets in character data")
            
            # .charx 파일에서 로드된 경우 이미 매핑이 되어 있으므로 건너뜀
            if not self.image_uri_map:
                for i, asset in enumerate(assets):
                    try:
                        asset_name = asset.get("name", "").strip()
                        if not asset_name:  # 이름이 없는 경우 번호 사용
                            asset_name = f"asset_{i}"
                        
                        # 여기가 핵심 수정 부분: 이미지 데이터의 키를 인덱스로 찾음
                        image_key = f"chara-ext-asset_:{i}"
                        
                        if image_key in self.image_data:
                            # asset_name(원본 태그명)을 키로 사용하여 매핑
                            self.image_uri_map[asset_name] = image_key
                            print(f"Successfully mapped: {asset_name} -> {image_key}")
                        else:
                            print(f"Warning: No image data found for {image_key}")
                            
                    except Exception as e:
                        print(f"Error processing individual asset {i}: {e}")
                        continue
                
                print(f"\nProcessing completed:")
                print(f"Total assets found: {len(assets)}")
                print(f"Successfully mapped: {len(self.image_uri_map)} assets")
                
            # 디버그 정보 출력
            self.debug_print_asset_info()
            
        except Exception as e:
            print(f"Error in _process_ccv3_assets: {e}")

    def save_assets(self):
        """에셋을 임시 폴더에 저장"""
        try:
            saved_count = 0
            print("\nSaving assets...")
            print(f"Image URI map contains {len(self.image_uri_map)} entries")
            print(f"Image data contains {len(self.image_data)} entries")
            
            # 디버깅을 위한 키 출력
            print("\nAvailable image_data keys:")
            for key in self.image_data.keys():
                print(f"- {key}")
                
            print("\nImage URI map entries:")
            for name, key in self.image_uri_map.items():
                print(f"- {name} -> {key}")
            
            for asset_name, asset_key in self.image_uri_map.items():
                try:
                    # 이미지 데이터가 있는지 확인
                    image_data = self.image_data.get(asset_key)
                    if image_data:
                        file_path = os.path.join(self.assets_folder, f"{asset_name}.png")
                        with open(file_path, 'wb') as img_file:
                            img_file.write(image_data)
                        saved_count += 1
                        print(f"Saved asset: {asset_name}")
                    else:
                        print(f"Warning: No image data found for {asset_key}")
                except Exception as e:
                    print(f"Error saving asset {asset_name}: {e}")
            
            print(f"\nSuccessfully saved {saved_count} assets")
            return saved_count > 0
        except Exception as e:
            print(f"Error in save_assets: {e}")
            return False

    def _extract_from_png(self, file_path):
        """PNG 파일에서 데이터 추출"""
        try:
            with open(file_path, 'rb') as f:
                png_signature = f.read(8)
                while True:
                    try:
                        length_bytes = f.read(4)
                        if len(length_bytes) != 4:
                            break
                        
                        length = struct.unpack('>I', length_bytes)[0]
                        chunk_type = f.read(4).decode('ascii')
                        chunk_data = f.read(length)
                        crc = f.read(4)
                        
                        if chunk_type == 'tEXt':
                            keyword_data, text_data = chunk_data.split(b'\x00', 1)
                            keyword = keyword_data.decode('ascii')
                            
                            if keyword in ['ccv3', 'chara']:
                                try:
                                    chara_json_data = base64.b64decode(text_data).decode('utf-8')
                                    self.character_data = json.loads(chara_json_data)
                                    print(f"Character data loaded: {keyword}")
                                    # CCv3 데이터를 로드한 직후 바로 처리
                                    if keyword == 'ccv3':
                                        self._process_ccv3_assets()
                                except Exception as e:
                                    print(f"Error decoding character data: {e}")
                            else:
                                try:
                                    png_data = base64.b64decode(text_data)
                                    key = f"chara-ext-asset_:{keyword.split(':')[-1]}"
                                    self.image_data[key] = png_data
                                    print(f"Image data loaded: {key}, size: {len(png_data)} bytes")
                                except Exception as e:
                                    print(f"Error processing image data for {keyword}: {e}")
                    except Exception as e:
                        print(f"Error processing PNG chunk: {e}")
                        break
            
            print(f"\nExtraction completed:")
            print(f"Total images found: {len(self.image_data)}")
            print(f"Total mappings created: {len(self.image_uri_map)}")
            return True
        except Exception as e:
            print(f"Error reading PNG file: {e}")
            return False

    def cleanup(self):
        """임시 파일 정리"""
        try:
            # 임시 폴더 삭제
            shutil.rmtree(self.assets_folder, ignore_errors=True)
            # 임시 폴더 재생성
            os.makedirs(self.assets_folder, exist_ok=True)
            
            # 내부 데이터 초기화
            self.character_data = None
            self.image_data.clear()
            self.image_uri_map.clear()
            
        except Exception as e:
            print(f"Error cleaning up assets: {e}")

    def debug_print_asset_info(self):
            """에셋 정보 출력 (디버깅용)"""
            print("\n=== Asset Debug Information ===")
            print(f"Total image data entries: {len(self.image_data)}")
            print("\nImage data keys:")
            for key in self.image_data.keys():
                print(f"- {key}")
            
            print("\nImage URI mappings:")
            for name, uri in self.image_uri_map.items():
                print(f"- {name} -> {uri}")
            
            print("\nCharacter data assets:")
            assets = self.character_data.get("data", {}).get("assets", [])
            for asset in assets:
                print(f"- Name: {asset.get('name')}, URI: {asset.get('uri')}")
            print("============================\n")

class PresetManager:
    def __init__(self, main_window):
        self.main_window = main_window
        # 프리셋 파일 경로 설정
        self.presets_file = os.path.join(
            QStandardPaths.writableLocation(QStandardPaths.StandardLocation.AppDataLocation),
            'color_presets.json'
        )
        # 디렉토리 생성
        os.makedirs(os.path.dirname(self.presets_file), exist_ok=True)
        self.presets = {}  # 프리셋 데이터 초기화
        self.load_presets()  # 저장된 프리셋 로드

    def load_presets(self):
        """저장된 프리셋 불러오기"""
        try:
            if os.path.exists(self.presets_file):
                with open(self.presets_file, 'r', encoding='utf-8') as f:
                    self.presets = json.load(f)
        except Exception as e:
            print(f"프리셋 로드 중 오류 발생: {e}")
            self.presets = {}

    def save_presets(self):
        """프리셋을 파일에 저장"""
        try:
            with open(self.presets_file, 'w', encoding='utf-8') as f:
                json.dump(self.presets, f, ensure_ascii=False, indent=2)
        except Exception as e:
            QMessageBox.warning(
                self.main_window,
                '오류',
                f'프리셋 저장 중 오류가 발생했습니다: {str(e)}'
            )

    def save_current_settings(self):
        """현재 색상 설정을 프리셋으로 저장"""
        name, ok = QInputDialog.getText(
            self.main_window,
            '프리셋 저장',
            '프리셋 이름을 입력하세요:'
        )
        
        if ok and name:
            if name in self.presets:
                reply = QMessageBox.question(
                    self.main_window,
                    '프리셋 덮어쓰기',
                    f'"{name}" 프리셋이 이미 존재합니다. 덮어쓰시겠습니까?',
                    QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
                )
                if reply == QMessageBox.StandardButton.No:
                    return

            try:
                # 색상 설정 수집 (새로운 설정 추가)
                current_settings = {
                    # 기존 설정
                    'outer_box_color': self.main_window.outer_box_color.get_color(),
                    'inner_box_color': self.main_window.inner_box_color.get_color(),
                    'bot_name_color': self.main_window.bot_name_color.get_color(),
                    'dialog_color': self.main_window.dialog_color.get_color(),
                    'narration_color': self.main_window.narration_color.get_color(),
                    'profile_border_color': self.main_window.profile_border_color.get_color(),
                    'divider_outer_color': self.main_window.divider_outer_color.get_color(),
                    'divider_inner_color': self.main_window.divider_inner_color.get_color(),
                    'divider_solid_color': self.main_window.divider_solid_color.get_color(),
                    'image_border_color': self.main_window.image_border_color.get_color(),
                    'tag_colors': [color.get_color() for color in self.main_window.tag_colors],
                    
                    # 새로 추가된 설정
                    'inner_thoughts_color': self.main_window.inner_thoughts_color.get_color(),
                    'box_border_color': self.main_window.box_border_color.get_color(),
                    
                    # 관련 체크박스 상태도 저장
                    'inner_thoughts_bold': self.main_window.inner_thoughts_bold.isChecked(),
                    'use_box_border': self.main_window.use_box_border.isChecked(),
                    'box_border_thickness': self.main_window.box_border_thickness.value()
                }

                self.presets[name] = current_settings
                self.save_presets()
                QMessageBox.information(
                    self.main_window,
                    '저장 완료',
                    f'프리셋 "{name}"이(가) 저장되었습니다.'
                )

            except Exception as e:
                QMessageBox.warning(
                    self.main_window,
                    '오류',
                    f'프리셋 저장 중 오류가 발생했습니다: {str(e)}'
                )


    def load_preset(self, name):
        """저장된 프리셋 불러오기"""
        try:
            if name not in self.presets:
                QMessageBox.warning(
                    self.main_window,
                    '오류',
                    f'프리셋 "{name}"을(를) 찾을 수 없습니다.'
                )
                return False

            settings = self.presets[name]
            
            # 색상 설정 적용
            self.main_window.outer_box_color.setColor(settings['outer_box_color'])
            self.main_window.inner_box_color.setColor(settings['inner_box_color'])
            self.main_window.bot_name_color.setColor(settings['bot_name_color'])
            self.main_window.dialog_color.setColor(settings['dialog_color'])
            self.main_window.narration_color.setColor(settings['narration_color'])
            self.main_window.profile_border_color.setColor(settings['profile_border_color'])
            self.main_window.divider_outer_color.setColor(settings['divider_outer_color'])
            self.main_window.divider_inner_color.setColor(settings['divider_inner_color'])
            self.main_window.divider_solid_color.setColor(settings['divider_solid_color'])
            self.main_window.image_border_color.setColor(settings['image_border_color'])

            # 새로 추가된 설정 적용
            if 'inner_thoughts_color' in settings:
                self.main_window.inner_thoughts_color.setColor(settings['inner_thoughts_color'])
            if 'box_border_color' in settings:
                self.main_window.box_border_color.setColor(settings['box_border_color'])
            
            # 체크박스 상태 적용
            if 'inner_thoughts_bold' in settings:
                self.main_window.inner_thoughts_bold.setChecked(settings['inner_thoughts_bold'])
            if 'use_box_border' in settings:
                self.main_window.use_box_border.setChecked(settings['use_box_border'])
            if 'box_border_thickness' in settings:
                self.main_window.box_border_thickness.setValue(settings['box_border_thickness'])

            # 태그 색상 적용
            for i, color in enumerate(settings['tag_colors']):
                if i < len(self.main_window.tag_colors):
                    self.main_window.tag_colors[i].setColor(color)

            # UI 업데이트
            self.main_window.update_preview()

            QMessageBox.information(
                self.main_window,
                '불러오기 완료',
                f'프리셋 "{name}"이(가) 적용되었습니다.'
            )
            return True

        except Exception as e:
            QMessageBox.warning(
                self.main_window,
                '오류',
                f'프리셋을 불러오는 중 오류가 발생했습니다: {str(e)}'
            )
            return False

    def delete_preset(self, name):
        """프리셋 삭제"""
        try:
            if name in self.presets:
                del self.presets[name]
                self.save_presets()
                QMessageBox.information(
                    self.main_window,
                    '삭제 완료',
                    f'프리셋 "{name}"이(가) 삭제되었습니다.'
                )
                return True
        except Exception as e:
            QMessageBox.warning(
                self.main_window,
                '오류',
                f'프리셋 삭제 중 오류가 발생했습니다: {str(e)}'
            )
        return False


class TagManager:
    def __init__(self, main_window):
        self.main_window = main_window
        self.tags_file = os.path.join(
            QStandardPaths.writableLocation(QStandardPaths.StandardLocation.AppDataLocation),
            'tag_sets'
        )
        os.makedirs(os.path.dirname(self.tags_file), exist_ok=True)

    def save_tag_set(self, name):
        """현재 태그 세트를 저장"""
        try:
            # 태그 데이터 수집
            tags = []
            for i in range(self.main_window.tag_layout.count()):
                widget = self.main_window.tag_layout.itemAt(i).widget()
                if isinstance(widget, TagEntry):
                    tag_data = widget.get_style_dict()
                    tags.append(tag_data)

            if not tags:
                raise ValueError("저장할 태그가 없습니다.")

            # 태그 세트 저장
            file_path = f"{self.tags_file}_{name}.json"
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(tags, f, ensure_ascii=False, indent=2)

            return True, f"태그 세트 '{name}'이(가) 저장되었습니다."
            
        except Exception as e:
            return False, f"태그 저장 중 오류 발생: {str(e)}"

    def load_tag_set(self, name):
        """저장된 태그 세트 불러오기"""
        try:
            file_path = f"{self.tags_file}_{name}.json"
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"태그 파일을 찾을 수 없습니다: {name}")

            with open(file_path, 'r', encoding='utf-8') as f:
                tags = json.load(f)

            # 기존 태그 제거
            while self.main_window.tag_layout.count():
                widget = self.main_window.tag_layout.takeAt(0).widget()
                if widget:
                    widget.deleteLater()

            # 새 태그 추가
            for tag_data in tags:
                entry = TagEntry(self.main_window.tag_container)
                entry.load_style_dict(tag_data)
                self.main_window.tag_layout.addWidget(entry)

            return True, f"태그 세트 '{name}'을(를) 불러왔습니다."
        except Exception as e:
            return False, f"태그 불러오기 중 오류 발생: {str(e)}"

    def delete_tag_set(self, name):
        """저장된 태그 세트 삭제"""
        try:
            file_path = f"{self.tags_file}_{name}.json"
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"태그 파일을 찾을 수 없습니다: {name}")

            os.remove(file_path)
            return True, f"태그 세트 '{name}'이(가) 삭제되었습니다."
        except Exception as e:
            return False, f"태그 삭제 중 오류 발생: {str(e)}"

    def get_available_tag_sets(self):
        """저장된 태그 세트 목록 반환"""
        try:
            tag_files = glob.glob(f"{self.tags_file}_*.json")
            return [os.path.basename(f)[len(os.path.basename(self.tags_file)) + 1:-5] 
                   for f in tag_files]
        except Exception:
            return []
    
    def save_tag_set_dialog(self):
        """태그 세트 저장 다이얼로그"""
        name, ok = QInputDialog.getText(
            self.main_window, '태그 세트 저장', '저장할 태그 세트의 이름을 입력하세요:'
        )
        if ok and name:
            # 중복 확인
            tag_file = f"{self.tags_file}_{name}.json"
            if os.path.exists(tag_file):
                reply = QMessageBox.question(
                    self.main_window,
                    '태그 덮어쓰기',
                    f'"{name}" 태그 세트가 이미 존재합니다. 덮어쓰시겠습니까?',
                    QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
                )
                if reply == QMessageBox.StandardButton.No:
                    return
                    
            success, message = self.save_tag_set(name)
            QMessageBox.information(self.main_window, "태그 저장", message)

    def load_tag_set_dialog(self):
        """태그 세트 불러오기 다이얼로그"""
        available_sets = self.get_available_tag_sets()
        if not available_sets:
            QMessageBox.information(self.main_window, "태그 불러오기", "저장된 태그 세트가 없습니다.")
            return
        
        name, ok = QInputDialog.getItem(
            self.main_window,
            "태그 불러오기",
            "불러올 태그 세트를 선택하세요:",
            available_sets,
            0,
            False
        )
        
        if ok and name:
            success, message = self.load_tag_set(name)
            QMessageBox.information(self.main_window, "태그 불러오기", message)

    def delete_tag_set_dialog(self):
        """태그 세트 삭제 다이얼로그"""
        available_sets = self.get_available_tag_sets()
        if not available_sets:
            QMessageBox.information(self.main_window, "태그 삭제", "저장된 태그 세트가 없습니다.")
            return
        
        name, ok = QInputDialog.getItem(
            self.main_window,
            "태그 삭제",
            "삭제할 태그 세트를 선택하세요:",
            available_sets,
            0,
            False
        )
        
        if ok and name:
            reply = QMessageBox.question(
                self.main_window,
                "태그 삭제 확인",
                f"태그 세트 '{name}'을(를) 정말 삭제하시겠습니까?",
                QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
            )
            
            if reply == QMessageBox.StandardButton.Yes:
                success, message = self.delete_tag_set(name)
                QMessageBox.information(self.main_window, "태그 삭제", message)


def resource_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(os.path.dirname(__file__))  # 이 부분이 변경됨
    return os.path.join(base_path, relative_path)

# 모던한 스타일 상수 정의
STYLES = {
    # 색상
    'primary': '#b0b2c6',
    'secondary': '#5856D6',
    'success': '#34C759',
    'background': '#FFFFFF',
    'surface': '#F2F2F7',
    'text': '#000000',
    'text_secondary': '#6C6C70',
    'border': '#C6C6C8',
    
    # 기본값
    'outer_box_color': '#ffffff',
    'inner_box_color': '#f8f9fa',
    'shadow_intensity': 8,
    'bot_name_color': '#4a4a4a',
    'tag_colors': ['#E3E3E8', '#E3E3E8', '#E3E3E8'], 
    'divider_outer_color': '#b8bacf',
    'divider_inner_color': '#ffffff',
    'dialog_color': '#4a4a4a',
    'narration_color': '#4a4a4a',
    'profile_border_color': '#ffffff',
    'text_indent': 20,
    
    # 폰트
    'font_family': 'Segoe UI, Roboto, Arial, sans-serif',  # 수정된 폰트 패밀리
    'font_size_large': 16,
    'font_size_normal': 14,
    'font_size_small': 12,
    'font_weight_normal': 500,
    'font_weight_bold': 600,
    
    # 간격
    'spacing_large': 24,
    'spacing_normal': 16,
    'spacing_small': 8,
    
    # 둥근 모서리
    'radius_large': 16,
    'radius_normal': 8,
    'radius_small': 4,
}


TEMPLATE_PRESETS = {
    "커스텀": {
        "outer_box_color": "#ffffff",
        "inner_box_color": "#f8f9fa",
        "background_color": "#f8f9fa",
        "bot_name_color": "#4a4a4a",
        "dialog_color": "#2d3748",
        "narration_color": "#4a5568",
        "inner_thoughts_color": "#718096",
        "profile_border_color": "#e2e8f0",
        "box_border_color": "#e2e8f0",
        "image_border_color": "#e2e8f0",
        "divider_outer_color": "#e2e8f0",
        "divider_inner_color": "#ffffff",
        "gradient_start": "#f8f9fa",
        "gradient_end": "#ffffff",
        "tag_colors": ["#edf2f7", "#e2e8f0", "#cbd5e0"],
        "tag_text_colors": ["#2d3748", "#2d3748", "#2d3748"]
    },
    "모던 블루": {
        "outer_box_color": "#1a202c",
        "inner_box_color": "#2d3748",
        "background_color": "#2d3748",
        "bot_name_color": "#90cdf4",
        "dialog_color": "#f7fafc",
        "narration_color": "#e2e8f0",
        "inner_thoughts_color": "#cbd5e0",
        "profile_border_color": "#4a5568",
        "box_border_color": "#4a5568",
        "image_border_color": "#4a5568",
        "divider_outer_color": "#4a5568",
        "divider_inner_color": "#2d3748",
        "gradient_start": "#1a202c",
        "gradient_end": "#2d3748",
        "tag_colors": ["#2c5282", "#2b6cb0", "#3182ce"],
        "tag_text_colors": ["#bee3f8", "#bee3f8", "#ffffff"]
    },
    "다크 모드": {
        "outer_box_color": "#000000",
        "inner_box_color": "#1a1a1a",
        "background_color": "#1a1a1a",
        "bot_name_color": "#ffffff",
        "dialog_color": "#ffffff",
        "narration_color": "#e0e0e0",
        "inner_thoughts_color": "#c0c0c0",
        "profile_border_color": "#333333",
        "box_border_color": "#333333",
        "image_border_color": "#333333",
        "divider_outer_color": "#333333",
        "divider_inner_color": "#1a1a1a",
        "gradient_start": "#000000",
        "gradient_end": "#1a1a1a",
        "tag_colors": ["#262626", "#333333", "#404040"],
        "tag_text_colors": ["#e0e0e0", "#e0e0e0", "#ffffff"]
    },
    "로즈 골드": {
        "outer_box_color": "#ffffff",
        "inner_box_color": "#fff5f5",
        "background_color": "#fff5f5",
        "bot_name_color": "#c53030",
        "dialog_color": "#2d3748",
        "narration_color": "#4a5568",
        "inner_thoughts_color": "#718096",
        "profile_border_color": "#feb2b2",
        "box_border_color": "#fc8181",
        "image_border_color": "#feb2b2",
        "divider_outer_color": "#fc8181",
        "divider_inner_color": "#ffffff",
        "gradient_start": "#fff5f5",
        "gradient_end": "#fed7d7",
        "tag_colors": ["#fed7d7", "#feb2b2", "#fc8181"],
        "tag_text_colors": ["#c53030", "#c53030", "#ffffff"]
    },
    "민트 그린": {
        "outer_box_color": "#ffffff",
        "inner_box_color": "#f0fff4",
        "background_color": "#f0fff4",
        "bot_name_color": "#2f855a",
        "dialog_color": "#2d3748",
        "narration_color": "#4a5568",
        "inner_thoughts_color": "#718096",
        "profile_border_color": "#9ae6b4",
        "box_border_color": "#68d391",
        "image_border_color": "#9ae6b4",
        "divider_outer_color": "#68d391",
        "divider_inner_color": "#ffffff",
        "gradient_start": "#f0fff4",
        "gradient_end": "#c6f6d5",
        "tag_colors": ["#c6f6d5", "#9ae6b4", "#68d391"],
        "tag_text_colors": ["#2f855a", "#2f855a", "#ffffff"]
    },
    "모던 퍼플": {
        "outer_box_color": "#ffffff",
        "inner_box_color": "#f8f5ff",
        "background_color": "#f8f5ff",
        "bot_name_color": "#6b46c1",
        "dialog_color": "#2d3748",
        "narration_color": "#4a5568",
        "inner_thoughts_color": "#718096",
        "profile_border_color": "#d6bcfa",
        "box_border_color": "#b794f4",
        "image_border_color": "#d6bcfa",
        "divider_outer_color": "#b794f4",
        "divider_inner_color": "#ffffff",
        "gradient_start": "#f8f5ff",
        "gradient_end": "#e9d8fd",
        "tag_colors": ["#e9d8fd", "#d6bcfa", "#b794f4"],
        "tag_text_colors": ["#6b46c1", "#6b46c1", "#ffffff"]
    },
    "오션 블루": {
        "outer_box_color": "#ffffff",
        "inner_box_color": "#ebf8ff",
        "background_color": "#ebf8ff",
        "bot_name_color": "#2c5282",
        "dialog_color": "#2d3748",
        "narration_color": "#4a5568",
        "inner_thoughts_color": "#718096",
        "profile_border_color": "#90cdf4",
        "box_border_color": "#63b3ed",
        "image_border_color": "#90cdf4",
        "divider_outer_color": "#63b3ed",
        "divider_inner_color": "#ffffff",
        "gradient_start": "#ebf8ff",
        "gradient_end": "#bee3f8",
        "tag_colors": ["#bee3f8", "#90cdf4", "#63b3ed"],
        "tag_text_colors": ["#2c5282", "#2c5282", "#ffffff"]
    },
    "선셋 오렌지": {
        "outer_box_color": "#ffffff",
        "inner_box_color": "#fffaf0",
        "background_color": "#fffaf0",
        "bot_name_color": "#c05621",
        "dialog_color": "#2d3748",
        "narration_color": "#4a5568",
        "inner_thoughts_color": "#718096",
        "profile_border_color": "#fbd38d",
        "box_border_color": "#f6ad55",
        "image_border_color": "#fbd38d",
        "divider_outer_color": "#f6ad55",
        "divider_inner_color": "#ffffff",
        "gradient_start": "#fffaf0",
        "gradient_end": "#feebc8",
        "tag_colors": ["#feebc8", "#fbd38d", "#f6ad55"],
        "tag_text_colors": ["#c05621", "#c05621", "#ffffff"]
    },
    "모카 브라운": {
        "outer_box_color": "#ffffff",
        "inner_box_color": "#faf5f1",
        "background_color": "#faf5f1",
        "bot_name_color": "#7b341e",
        "dialog_color": "#2d3748",
        "narration_color": "#4a5568",
        "inner_thoughts_color": "#718096",
        "profile_border_color": "#d6bcab",
        "box_border_color": "#b08b6e",
        "image_border_color": "#d6bcab",
        "divider_outer_color": "#b08b6e",
        "divider_inner_color": "#ffffff",
        "gradient_start": "#faf5f1",
        "gradient_end": "#e8d6cf",
        "tag_colors": ["#e8d6cf", "#d6bcab", "#b08b6e"],
        "tag_text_colors": ["#7b341e", "#7b341e", "#ffffff"]
    },
    "스페이스 그레이": {
        "outer_box_color": "#1a1a1a",
        "inner_box_color": "#2d2d2d",
        "background_color": "#2d2d2d",
        "bot_name_color": "#e2e2e2",
        "dialog_color": "#ffffff",
        "narration_color": "#d1d1d1",
        "inner_thoughts_color": "#b0b0b0",
        "profile_border_color": "#404040",
        "box_border_color": "#404040",
        "image_border_color": "#404040",
        "divider_outer_color": "#404040",
        "divider_inner_color": "#2d2d2d",
        "gradient_start": "#1a1a1a",
        "gradient_end": "#2d2d2d",
        "tag_colors": ["#404040", "#4a4a4a", "#525252"],
        "tag_text_colors": ["#e2e2e2", "#e2e2e2", "#ffffff"]
    },
    "그라데이션 모던": {
        "outer_box_color": "#fafafa",
        "inner_box_color": "#fafafa",
        "background_color": "#fafafa",
        "bot_name_color": "#494949",
        "dialog_color": "#494949",
        "narration_color": "#666666",
        "inner_thoughts_color": "#808080",
        "profile_border_color": "#e3e3e3",
        "box_border_color": "#e9e9e9",
        "image_border_color": "#e3e3e3",
        "divider_outer_color": "#e9e9e9",
        "divider_inner_color": "#e9e9e9",
        "gradient_start": "#D9D782",
        "gradient_end": "#A9B9D9",
        "tag_colors": ["#494949", "#494949", "#494949"],
        "tag_text_colors": ["#d5d5d5", "#d5d5d5", "#d5d5d5"]
    }
}


# 기본 프로필 이미지 (placeholder)
DEFAULT_PROFILE_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQAAABkCAYAAABw4pVUAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4wYJBhYRN2n7qQAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAAEiUlEQVR42u2dW2hcVRSGv3XOxEmTmTRp2kziJU0UqUVriy+CLxZfi1gUX3wTfPBJ8EkQwQteMFIfLFoQxQteMCJeULQoquKDgheCbdHWam0vMW3TJm0ymUzmnJk5e/kwt7SSOSdNOpN91v+0YQ577T3/f9bea6+99hgTExMTExMTExMTE5NbE2lNRapr+xUwD8gFEWB4dJQrAyfo6+1JXGsAD4vgSQgbj0EkLgcKqAocxeWkOJwgrr+1JR1CJovpKDxbgUfFY4vApgJJACIgHkioIghYgDCwLlCjsV4mE3YyELBDQRYEHVKOEhKQEYFMURaLsAhYPr5wYkBEGFOXIZcEtjE2DWgmWYagSEwGXWVxWvGKpcQR+qIW5wYsCm5K7DQXn4xSEu/Hw0J9LyeOg0e2RTgrmALZYEfIlDCHew6xvKjEpuXsKHiJcqNUqWAsEzFPt8QRxK+A/lCIU/lFtM8PsXdVmBdiZXyiNluIc6hrPxt6HYpkmGTa5CWbQ48cUBIFxMJjXuEALyaWcPp4DesWb2N/SnycGPPxqABfimIMSUBJpAYRDwXm5vXxQayaV2QZO4kTlJAvn7xgwqe3bkEAevKEJUWCiUQNIuCJ0lR3lb3HDpC32SZzk6QaE0EBRBhVDxEhLh4RD0Q9clQoFEhcwPd6BcwXGRIYU6VPhJj6FOARBo6ny9kYGuRo1zeMxEcoWxtlUEEFJKSAqjKkMKxCSISwQDEQUsETxRXBQ7BE8EQQVVxbKVCbEYHjwEsiZxAsgWVWnPq2GNUt7URo5GTNaZbVDnKnZdN0vJY3B7JZIw4t6pPGElx1cUUZE2FYlYgqloArQlCUAlXyVclWiKsyKoIliqseYVEUYVSVfhFCAlFVRgSiojjq4agQUyVPhDCAqBAVxRMlR4SQKq7CkAhRUVwRPIGwKo5ATABPsVWIq4cnQlCVuAoeEBTBUSWkEFElLEKBKDnq4QKOQESEYVXiqgQFwqpEFWSszTiqOCLY6hEX8LQ8hwc74OIcIVB9nJbmTr7rPMzg0EUcN0aWVo5n6AW27XB5YjfHA6V8r1kuEXFwhZAqriioKo4IUYGoCIUKeaqERMhWIU+VHFGGBIZViaq/fPl/OHIcXBRbBFshLkqOQESUiEJIBFuUQYVRVWz1CAmoCrZ6xFSxEQLqkSsQFigQxVXBFsUVGFPwRHBViSsEBBRBRQmJkqNg64R4iHi4ohQi2KLYAiEVXFVy1CMoSgQIihATxRXFq0mQHspmLmA8BRFQhJgqYVFsAVdASYiHCGFV8kSwx1NX4fV5ZrE9nMfF+BD5JQrFDsUWBEUIixBTxRbBBkSUMYGQKA5gixJXJSxQKEKY8fM4FWwEVyAmQlyEkCpxEYIK+QIB9chRGD/pE2KixFUJq2IrBEQJiRBRZUQgJEJQwRMQEYbVI6Yg6hFQwEU8EWyBoCqOQFggR5SQguv5OxGDIgQEHBWiAjGBoHrkC4RFGQMiAgHAdYW5IgSBEQHiEMWlQqBIICJCXAVHYNAVBgUyRYgJxBDiOHQrZIsy6qZRzxsmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJiYmJtPI3wlK8GXlSW/WAAAAAElFTkSuQmCC"

    

class ModernButton(QPushButton):
    """모던한 스타일의 버튼 컴포넌트"""
    def __init__(self, text, primary=False, parent=None):
        super().__init__(text, parent)
        self.primary = primary
        self.setup_style()
        self.error_handler = ErrorHandler(self)

        try:
            # 위험한 작업 수행
            pass
        except Exception as e:
            self.error_handler.handle_error(
                "작업 처리 중 오류가 발생했습니다.",
                ErrorSeverity.HIGH,
                e
            )


    def setup_style(self):
        style = f"""
            QPushButton {{
                background-color: {STYLES['primary'] if self.primary else STYLES['surface']};
                color: {'white' if self.primary else STYLES['text']};
                border: none;
                border-radius: {STYLES['radius_normal']}px;
                padding: 8px 16px;
                font-size: {STYLES['font_size_normal']}px;
                font-weight: {STYLES['font_weight_normal']};
            }}
            QPushButton:hover {{
                background-color: {'#9597a8' if self.primary else '#E5E5EA'};
            }}
            QPushButton:pressed {{
                background-color: {'#7a7c8a' if self.primary else '#D1D1D6'};
            }}
        """
        self.setStyleSheet(style)

class ModernColorButton(QPushButton):
    """색상 선택 버튼 컴포넌트"""
    def __init__(self, color, parent=None):
        super().__init__(parent)
        self.setFixedSize(32, 32)
        self.color = color
        self.setColor(color)
        # 새로 추가: 우클릭 메뉴 활성화
        self.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
        self.customContextMenuRequested.connect(self.show_context_menu)
        
    def setColor(self, color):
        self.color = color
        style = f"""
            QPushButton {{
                background-color: {color};
                border: 2px solid {STYLES['border']};
                border-radius: {STYLES['radius_normal']}px;
            }}
            QPushButton:hover {{
                border: 2px solid {STYLES['primary']};
            }}
        """
        self.setStyleSheet(style)
        
    def get_color(self):
        return self.color

    # 새로 추가: 우클릭 메뉴 표시
    def show_context_menu(self, position):
        menu = QMenu(self)
        reset_action = menu.addAction("기본색으로 리셋")
        reset_action.triggered.connect(self.reset_color)
        menu.exec(self.mapToGlobal(position))

    # 새로 추가: 색상 리셋
    def reset_color(self):
        """색상을 기본값으로 리셋"""
        default_color = "#000000"  # 기본 검은색
        self.setColor(default_color)
        self.color = default_color

class ModernComboBox(QComboBox):
    """모던한 스타일의 콤보박스 컴포넌트"""
    def __init__(self, parent=None):
        super().__init__(parent)
        style = f"""
            QComboBox {{
                background-color: {STYLES['surface']};
                border: none;
                border-radius: {STYLES['radius_normal']}px;
                padding: 8px 12px;
                font-size: {STYLES['font_size_normal']}px;
                color: {STYLES['text']};
                min-width: 120px;
                font-weight: {STYLES['font_weight_normal']};
            }}
            QComboBox::drop-down {{
                border: none;
                width: 20px;
            }}
            QComboBox QAbstractItemView {{
                background-color: {STYLES['surface']};
                border: 1px solid {STYLES['border']};
                border-radius: {STYLES['radius_normal']}px;
                selection-background-color: {STYLES['primary']};
                selection-color: white;
                color: {STYLES['text']};
            }}
            QComboBox::item:selected {{
                background-color: {STYLES['primary']};
                color: white;
            }}
            QComboBox::item:hover {{
                background-color: {STYLES['border']};
            }}
        """
        self.setStyleSheet(style)
        
    def wheelEvent(self, event):
        """마우스 휠 이벤트 무시"""
        event.ignore()

class ModernCheckBox(QCheckBox):
    """모던한 스타일의 체크박스 컴포넌트"""
    def __init__(self, text, parent=None):
        super().__init__(text, parent)
        style = f"""
            QCheckBox {{
                font-size: {STYLES['font_size_normal']}px;
                color: {STYLES['text']};
                font-weight: {STYLES['font_weight_normal']};
            }}
            QCheckBox::indicator {{
                width: 20px;
                height: 20px;
                border-radius: 4px;
                border: 2px solid {STYLES['border']};
            }}
            QCheckBox::indicator:unchecked {{
                background-color: rgba(0, 0, 0, 0.5);  /* 검은색 50% 투명도 */
            }}
            QCheckBox::indicator:checked {{
                background-color: #32D74B;  /* 연한 초록색 */
                border-color: #32D74B;
            }}
        """
        self.setStyleSheet(style)

class SettingsGroup(QWidget):
    """설정 그룹 컨테이너 컴포넌트"""
    def __init__(self, title, parent=None):
        super().__init__(parent)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, STYLES['spacing_large'])
        
        # 헤더
        header = QLabel(title)
        header.setFont(QFont(STYLES['font_family'], STYLES['font_size_large'], STYLES['font_weight_bold']))
        layout.addWidget(header)
        
        # 구분선
        line = QFrame()
        line.setFrameShape(QFrame.Shape.HLine)
        line.setStyleSheet(f"background-color: {STYLES['border']};")
        layout.addWidget(line)
        
        # 콘텐츠 컨테이너
        self.content = QWidget()
        self.content_layout = QVBoxLayout(self.content)
        self.content_layout.setContentsMargins(0, STYLES['spacing_small'], 0, 0)
        self.content_layout.setSpacing(STYLES['spacing_small'])
        layout.addWidget(self.content)
        
    def addWidget(self, widget):
        self.content_layout.addWidget(widget)
        
    def addLayout(self, layout):
        self.content_layout.addLayout(layout)

class ModernSpinBox(QSpinBox):
    """모던한 스타일의 스핀박스 컴포넌트"""
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setStyleSheet(f"""
            QSpinBox {{
                background-color: {STYLES['surface']};
                border: none;
                border-radius: {STYLES['radius_normal']}px;
                padding: 8px 12px;
                font-size: {STYLES['font_size_normal']}px;
                color: {STYLES['text']};
                font-weight: {STYLES['font_weight_normal']};
                min-width: 40px;
            }}
            QSpinBox::up-button, QSpinBox::down-button {{
                border: none;
                width: 20px;
            }}
        """)
        
    def wheelEvent(self, event):
        """마우스 휠 이벤트 무시"""
        event.ignore()

class WordReplaceEntry(QWidget):
    """단어 변경을 위한 입력 컴포넌트"""
    def __init__(self, parent=None):
        super().__init__(parent)
        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        # 변환할 단어 입력
        self.from_word = QLineEdit()
        self.from_word.setPlaceholderText("변환할 단어")
        layout.addWidget(self.from_word)
        
        # 화살표 라벨
        arrow_label = QLabel("→")
        layout.addWidget(arrow_label)
        
        # 변환될 단어 입력
        self.to_word = QLineEdit()
        self.to_word.setPlaceholderText("변환될 단어")
        layout.addWidget(self.to_word)
        
        # 삭제 버튼
        delete_btn = ModernButton("삭제")
        delete_btn.setFixedWidth(60)
        delete_btn.clicked.connect(self.remove_self)
        layout.addWidget(delete_btn)

    def remove_self(self):
        """안전하게 자신을 제거"""
        self.setParent(None)  # 부모로부터 분리
        self.deleteLater()    # 나중에 삭제되도록 예약

class ImageUrlEntry(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        layout = QHBoxLayout(self)  # 수평 레이아웃으로 변경
        layout.setContentsMargins(0, 0, 0, 0)
        
        # 태그 입력
        self.tag_input = QLineEdit()
        self.tag_input.setPlaceholderText("이미지 태그 (예: Orca_surprised)")
        layout.addWidget(self.tag_input)
        
        # 화살표 레이블
        arrow_label = QLabel("→")
        layout.addWidget(arrow_label)
        
        # URL 입력
        self.url_input = QLineEdit()
        self.url_input.setPlaceholderText("이미지 URL")
        layout.addWidget(self.url_input)
        
        # 삭제 버튼
        delete_btn = ModernButton("삭제")
        delete_btn.setFixedWidth(60)
        delete_btn.clicked.connect(self.remove_self)
        layout.addWidget(delete_btn)

    def remove_self(self):
        """안전하게 자신을 제거"""
        self.setParent(None)
        self.deleteLater()

    def to_dict(self):
        """현재 매핑 정보를 딕셔너리로 반환"""
        return {
            'tag': self.tag_input.text().strip(),
            'url': self.url_input.text().strip()
        }

    def from_dict(self, data):
        """딕셔너리에서 매핑 정보 로드"""
        self.tag_input.setText(data.get('tag', ''))
        self.url_input.setText(data.get('url', ''))

class TagEntry(QWidget):
    """개선된 태그 입력 컴포넌트"""
    tagChanged = pyqtSignal()  # 태그 변경 시그널
    
    def __init__(self, parent=None):
        super().__init__(parent)
        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        
        # 태그 컨테이너
        tag_container = QWidget()
        tag_layout = QHBoxLayout(tag_container)
        tag_layout.setSpacing(8)
        
        # 태그 텍스트 입력
        self.tag_input = QLineEdit()
        self.tag_input.setPlaceholderText("태그 입력")
        self.tag_input.textChanged.connect(self.on_tag_changed)
        tag_layout.addWidget(self.tag_input)
        
        # 색상 설정 컨테이너
        color_container = QHBoxLayout()
        
        # 배경색/테두리색 레이블과 버튼
        self.color_label = QLabel("배경색")
        color_container.addWidget(self.color_label)
        
        self.color_btn = ModernColorButton("#E3E3E8")
        self.color_btn.clicked.connect(self.choose_color)
        color_container.addWidget(self.color_btn)

        # 텍스트 색상 레이블과 버튼 추가
        self.text_color_label = QLabel("텍스트")
        color_container.addWidget(self.text_color_label)
        
        self.text_color_btn = ModernColorButton("#000000")  # 기본 텍스트 색상은 검정
        self.text_color_btn.clicked.connect(self.choose_text_color)
        color_container.addWidget(self.text_color_btn)
        
        # 스타일 선택 콤보박스 추가
        self.style_combo = ModernComboBox()
        self.style_combo.addItems(["기본", "투명 배경", "그라데이션"])
        self.style_combo.currentTextChanged.connect(self.update_style_settings)
        color_container.addWidget(self.style_combo)
        
        tag_layout.addLayout(color_container)
        layout.addWidget(tag_container)
        
        # 삭제 버튼
        delete_btn = ModernButton("삭제")
        delete_btn.setFixedWidth(60)
        delete_btn.clicked.connect(self.remove_self)
        layout.addWidget(delete_btn)
        
        # 고급 설정 초기화
        self.border_radius = 20
        self.font_size = 0.85
        self.padding = {"top": 0.2, "right": 0.8, "bottom": 0.2, "left": 0.8}

    def choose_color(self):
        """배경색 선택 다이얼로그"""
        color = QColorDialog.getColor()
        if color.isValid():
            self.color_btn.setColor(color.name())
            self.on_tag_changed()
            
    def choose_text_color(self):
        """텍스트 색상 선택 다이얼로그"""
        color = QColorDialog.getColor()
        if color.isValid():
            self.text_color_btn.setColor(color.name())
            self.on_tag_changed()
            
    def update_style_settings(self, style):
        """스타일 변경에 따른 UI 업데이트"""
        is_transparent = style == "투명 배경"
        self.color_label.setText("테두리색" if is_transparent else "배경색")
        self.on_tag_changed()
        
    def on_tag_changed(self):
        """태그 변경 시그널 발생"""
        self.tagChanged.emit()
        
    def remove_self(self):
        """안전하게 자신을 제거"""
        self.setParent(None)
        self.deleteLater()
        
    def get_style_dict(self):
        """태그 스타일 정보를 딕셔너리로 반환"""
        return {
            'text': self.tag_input.text(),
            'color': self.color_btn.get_color(),
            'text_color': self.text_color_btn.get_color(),  # 텍스트 색상 추가
            'style': self.style_combo.currentText(),
            'border_radius': self.border_radius,
            'font_size': self.font_size,
            'padding': self.padding.copy()
        }
        
    def load_style_dict(self, style_dict):
        """딕셔너리에서 스타일 정보 로드"""
        self.tag_input.setText(style_dict.get('text', ''))
        self.color_btn.setColor(style_dict.get('color', '#E3E3E8'))
        self.text_color_btn.setColor(style_dict.get('text_color', '#000000'))  # 텍스트 색상 로드
        self.style_combo.setCurrentText(style_dict.get('style', '기본'))
        self.border_radius = style_dict.get('border_radius', 20)
        self.font_size = style_dict.get('font_size', 0.85)
        self.padding = style_dict.get('padding', {
            "top": 0.2, "right": 0.8, 
            "bottom": 0.2, "left": 0.8
        })

class ModernLogGenerator(QMainWindow):
    def __init__(self):
        super().__init__()
        
        self.error_handler = ErrorHandler(self)

        # bot_name 속성 추가
        self.bot_name = QLineEdit()
        self.bot_name.setPlaceholderText("봇 이름")
        
        # 매니저 초기화
        self.profile_manager = ProfileManager(self)
        
        # 캐시 매니저 초기화
        self.image_cache_manager = ImageCacheManager()
        
        # 캐시 정리 타이머 설정
        self.cache_cleanup_timer = QTimer()
        self.cache_cleanup_timer.setInterval(3600000)  # 1시간마다
        self.cache_cleanup_timer.timeout.connect(self.cleanup_caches)
        self.cache_cleanup_timer.start()

        self.preview_timer = None
        self.resource_manager = ResourceManager(self)
        
        # Settings & Cache Initialization
        self.settings = QSettings('YourCompany', 'LogGenerator')
        self.image_cache = ImageCache()
        
        # 매니저 초기화
        self.template_manager = TemplateManager(self)
        self.mapping_manager = MappingManager(self)
        self.tag_manager = TagManager(self)
        self.word_replace_manager = WordReplaceManager(self)
        self.preset_manager = PresetManager(self)
        
        # Character Card Handler
        self.card_handler = CharacterCardHandler()
        self.asset_name_img_tag_map = {}
        
        # Splitter
        self.splitter = None
        
        # Tag Related Initialization
        self.tag_boxes = []
        self.tag_colors = []
        self.tag_transparent = []
        self.tag_presets = {}
        self.load_tag_presets_from_file()
        
        # UI Initialization
        self.init_ui()
        self.restore_geometry_and_state()

        # Icon Setup
        icon_path = resource_path('log_icon.ico')
        self.setWindowIcon(QIcon(icon_path))
        
        # Dark Mode Handler
        self.color_scheme_handler = QApplication.instance().styleHints()
        self.color_scheme_handler.colorSchemeChanged.connect(self.update_color_scheme)
        
        # Profile Image Handlers
        self.init_profile_image_handlers()

        # Apply Default Template
        self.template_manager.apply_template("커스텀")

        # Auto Save Timer
        self.auto_save_timer = QTimer()
        self.auto_save_timer.setInterval(60000)  # 1분마다 자동 저장
        self.auto_save_timer.timeout.connect(self.auto_save)
        self.auto_save_timer.start()



    def cleanup_caches(self):
        """주기적 캐시 정리"""
        try:
            # 만료된 캐시 항목 정리
            cleaned_count = self.image_cache_manager.cleanup_expired()
            
            # 캐시 상태 확인
            stats = self.image_cache_manager.get_stats()
            
            # 로그에 기록
            if cleaned_count > 0:
                print(f"캐시 정리 완료: {cleaned_count}개 항목 제거")
                print(f"현재 캐시 상태: {stats}")
                
        except Exception as e:
            self.error_handler.handle_error(
                "캐시 정리 중 오류가 발생했습니다.",
                ErrorSeverity.LOW,
                e
            )
            
    def process_image_url(self, url):
        """이미지 URL 처리 (캐시 활용)"""
        try:
            # 캐시 확인
            cached_data = self.image_cache_manager.get(url)
            if cached_data:
                return cached_data
                
            # 캐시에 없으면 처리
            processed_url = super().process_image_url(url)
            
            # 캐시 저장
            self.image_cache_manager.set(url, processed_url)
            
            return processed_url
            
        except Exception as e:
            self.error_handler.handle_error(
                "이미지 URL 처리 중 오류가 발생했습니다.",
                ErrorSeverity.MEDIUM,
                e
            )
            return DEFAULT_PROFILE_IMAGE
            
    def show_cache_stats(self):
        """캐시 상태 표시 다이얼로그"""
        try:
            stats = self.image_cache_manager.get_stats()
            
            msg = (
                f"캐시 상태 정보:\n\n"
                f"총 항목 수: {stats['total_items']}\n"
                f"최대 항목 수: {stats['max_size']}\n"
                f"사용률: {stats['utilization']}\n"
                f"총 용량: {stats['total_size_mb']}\n"
                f"최대 용량: {stats['max_size_mb']}\n"
                f"용량 사용률: {stats['size_utilization']}\n"
                f"가장 오래된 항목: {stats['oldest_item_age']:.1f}초\n"
                f"최신 항목: {stats['newest_item_age']:.1f}초"
            )
            
            QMessageBox.information(self, "캐시 상태", msg)
            
        except Exception as e:
            self.error_handler.handle_error(
                "캐시 상태 확인 중 오류가 발생했습니다.",
                ErrorSeverity.LOW,
                e
            )


    def auto_save(self):
        """자동 저장 기능"""
        try:
            # 현재 설정들 저장
            self.save_settings()
            print("자동 저장 완료")
        except Exception as e:
            print(f"자동 저장 중 오류 발생: {str(e)}")

    def save_settings(self):
        """현재 설정 저장"""
        try:
            # 각종 설정 저장
            self.preset_manager.save_presets()
            self.save_tag_presets_to_file()
            self.image_cache.save_mappings()
            
            # 창 위치와 크기 저장
            self.settings.setValue('window_geometry', self.saveGeometry())
            if self.splitter:
                self.settings.setValue('splitter_state', self.splitter.saveState())
        except Exception as e:
            print(f"설정 저장 중 오류 발생: {str(e)}")

    def create_preset_button(self):
        """프리셋 관리 버튼 생성"""
        preset_btn = ModernButton("프리셋 관리")
        preset_btn.setFixedWidth(150)
        preset_btn.clicked.connect(self.show_preset_menu)
        return preset_btn

    def show_preset_menu(self):
        """프리셋 관리 메뉴 표시"""
        menu = QMenu(self)
        
        # === 프리셋 관련 메뉴 ===
        preset_menu = menu.addMenu("프리셋 관리")
        
        # 현재 설정 저장
        save_preset_action = preset_menu.addAction("현재 설정을 프리셋으로 저장")
        save_preset_action.triggered.connect(self.preset_manager.save_current_settings)
        
        if self.preset_manager.presets:
            preset_menu.addSeparator()
            
            # 저장된 프리셋 관리
            load_preset_menu = preset_menu.addMenu("프리셋 불러오기")
            delete_preset_menu = preset_menu.addMenu("프리셋 삭제")
            
            for name in sorted(self.preset_manager.presets.keys()):
                # 불러오기 메뉴
                load_action = load_preset_menu.addAction(name)
                load_action.triggered.connect(lambda checked, n=name: self.preset_manager.load_preset(n))
                
                # 삭제 메뉴
                delete_action = delete_preset_menu.addAction(name)
                delete_action.triggered.connect(lambda checked, n=name: self.preset_manager.delete_preset(n))


    def load_tag_presets_from_file(self):
        """태그 프리셋 파일에서 불러오기"""
        try:
            preset_file = os.path.join(
                QStandardPaths.writableLocation(QStandardPaths.StandardLocation.AppDataLocation),
                'tag_presets.json'
            )
            if os.path.exists(preset_file):
                with open(preset_file, 'r', encoding='utf-8') as f:
                    self.tag_presets = json.load(f)
        except Exception as e:
            print(f"태그 프리셋 로드 중 오류: {str(e)}")
            self.tag_presets = {}

    def save_tag_presets_to_file(self):
        """태그 프리셋을 파일에 저장"""
        try:
            preset_file = os.path.join(
                QStandardPaths.writableLocation(QStandardPaths.StandardLocation.AppDataLocation),
                'tag_presets.json'
            )
            # 디렉토리가 없으면 생성
            os.makedirs(os.path.dirname(preset_file), exist_ok=True)
            
            with open(preset_file, 'w', encoding='utf-8') as f:
                json.dump(self.tag_presets, f, ensure_ascii=False, indent=2)
        except Exception as e:
            QMessageBox.warning(
                self,
                '오류',
                f'태그 프리셋 저장 중 오류가 발생했습니다: {str(e)}'
            )

    def init_ui(self):
        """UI 초기화"""
        self.setWindowTitle("LogGenerator Pro")
        self.setGeometry(100, 100, 1200, 800)
        self.setMinimumSize(800, 600)
        self.setup_styles()

        # 중앙 위젯 설정
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QHBoxLayout(central_widget)
        main_layout.setContentsMargins(STYLES['spacing_large'], STYLES['spacing_large'], 
                                    STYLES['spacing_large'], STYLES['spacing_large'])
        main_layout.setSpacing(STYLES['spacing_normal'])
        
        # === Splitter 추가 ===
        self.splitter = QSplitter(Qt.Orientation.Horizontal)  # self.splitter로 변경
        self.splitter.setHandleWidth(12)
        self.splitter.setStyleSheet("""
            QSplitter::handle {
                background: transparent;
                margin: 0 5px;
            }
            QSplitter::handle:horizontal {
                image: url(none);
                width: 12px;
                background-color: transparent;
                border-left: 2px solid #cccccc;
                margin: 0 5px;
            }
            QSplitter::handle:horizontal:hover {
                border-left: 4px solid #999999;
                margin: 0 4px;
            }
            QSplitter::handle:horizontal:pressed {
                border-left: 4px solid #666666;
                margin: 0 4px;
            }
        """)
        
        # === 왼쪽 패널 (설정) ===
        left_panel = self.create_settings_panel()
        left_panel.setMinimumWidth(0)      # 완전히 접을 수 있도록
        left_panel.setMaximumWidth(800)    # 최대 너비 여유있게 증가
        
        # === 오른쪽 패널 (입출력) ===
        right_panel = self.create_io_panel()
        right_panel.setMinimumWidth(0)     # 완전히 접을 수 있도록
        
        # 패널들을 splitter에 추가
        self.splitter.addWidget(left_panel)     # self.splitter 사용
        self.splitter.addWidget(right_panel)    # self.splitter 사용
        
        # splitter 크기 비율 설정
        self.splitter.setStretchFactor(0, 1)    # self.splitter 사용
        self.splitter.setStretchFactor(1, 2)    # self.splitter 사용
        
        # 초기 크기를 화면 크기에 비례하여 설정
        total_width = self.width()
        self.splitter.setSizes([total_width // 3, (total_width * 2) // 3])  # self.splitter 사용
        
        # splitter를 메인 레이아웃에 추가
        main_layout.addWidget(self.splitter)    # self.splitter 사용

        # 초기 크기 설정 전에 저장된 상태가 있는지 확인
        splitter_state = self.settings.value('splitter_state')
        if splitter_state:
            self.splitter.restoreState(splitter_state)
        else:
            # 저장된 상태가 없으면 기본값 설정
            total_width = self.width()
            self.splitter.setSizes([total_width // 3, (total_width * 2) // 3])

    def restore_geometry_and_state(self):
        """창 크기/위치와 splitter 상태 복원"""
        # 창 크기와 위치 복원
        geometry = self.settings.value('window_geometry')
        if geometry:
            self.restoreGeometry(geometry)

        # Splitter 상태 복원
        if self.splitter:  # splitter가 초기화된 후에만 실행
            splitter_state = self.settings.value('splitter_state')
            if splitter_state:
                self.splitter.restoreState(splitter_state)

    def setup_styles(self):
        """전역 스타일 설정"""
        self.setStyleSheet(f"""
            QMainWindow, QWidget {{
                background-color: {STYLES['background']};
                font-weight: {STYLES['font_weight_normal']};
            }}
            QLabel {{
                font-size: {STYLES['font_size_normal']}px;
                color: {STYLES['text']};
                font-weight: {STYLES['font_weight_normal']};
            }}
            QLineEdit {{
                background-color: {STYLES['surface']};
                border: none;
                border-radius: {STYLES['radius_normal']}px;
                padding: 8px 12px;
                font-size: {STYLES['font_size_normal']}px;
                color: {STYLES['text']};
                font-weight: {STYLES['font_weight_normal']};
            }}
            QTextEdit {{
                background-color: {STYLES['surface']};
                border: none;
                border-radius: {STYLES['radius_normal']}px;
                padding: 12px;
                font-size: {STYLES['font_size_normal']}px;
                color: {STYLES['text']};
                font-weight: {STYLES['font_weight_normal']};
            }}
            
            /* 수직 스크롤바 스타일 */
            QScrollBar:vertical {{
                border: none;
                background-color: {STYLES['background']};
                width: 10px;
                margin: 0;
            }}
            QScrollBar::handle:vertical {{
                background-color: #A0A0A0;
                min-height: 30px;
                border-radius: 5px;
            }}
            QScrollBar::handle:vertical:hover {{
                background-color: #808080;
            }}
            QScrollBar::add-line:vertical,
            QScrollBar::sub-line:vertical {{
                height: 0px;
            }}
            QScrollBar::add-page:vertical,
            QScrollBar::sub-page:vertical {{
                background: none;
            }}
            
            /* 수평 스크롤바 스타일 */
            QScrollBar:horizontal {{
                border: none;
                background-color: {STYLES['background']};
                height: 10px;
                margin: 0;
            }}
            QScrollBar::handle:horizontal {{
                background-color: #A0A0A0;
                min-width: 30px;
                border-radius: 5px;
            }}
            QScrollBar::handle:horizontal:hover {{
                background-color: #808080;
            }}
            QScrollBar::add-line:horizontal,
            QScrollBar::sub-line:horizontal {{
                width: 0px;
            }}
            QScrollBar::add-page:horizontal,
            QScrollBar::sub-page:horizontal {{
                background: none;
            }}
        """)

    def update_color_scheme(self):
        """다크모드 전환 처리"""
        try:
            is_dark = self.color_scheme_handler.colorScheme() == Qt.ColorScheme.Dark
            
            # 기본 스타일 업데이트
            new_styles = {
                'background': '#1C1C1E' if is_dark else '#FFFFFF',
                'surface': '#2C2C2E' if is_dark else '#F2F2F7',
                'text': '#FFFFFF' if is_dark else '#000000',
                'text_secondary': '#98989D' if is_dark else '#6C6C70',
                'border': '#3A3A3C' if is_dark else '#C6C6C8',
            }
            
            STYLES.update(new_styles)
            self.setup_styles()
            
            # 다크모드에 따른 템플릿 자동 전환
            if is_dark and self.template_combo.currentText() != "다크 모드":
                self.template_combo.setCurrentText("다크 모드")
            elif not is_dark and self.template_combo.currentText() == "다크 모드":
                self.template_combo.setCurrentText("커스텀")
            
            # 미리보기 업데이트
            self.update_preview()
            
        except Exception as e:
            self.handle_error(
                "데이터 처리 중 오류가 발생했습니다.",
                ErrorSeverity.MEDIUM,
                e
            )

    def update_preview(self):
        """미리보기 업데이트"""
        try:
            # 이전 타이머 중지
            if hasattr(self, 'preview_timer') and self.preview_timer:
                self.preview_timer.stop()
            
            # 새 타이머 생성
            self.preview_timer = QTimer()
            self.preview_timer.setSingleShot(True)
            
            def do_update():
                try:
                    if hasattr(self, 'input_text') and hasattr(self, 'output_text'):
                        # 현재 커서 위치 저장
                        cursor = self.output_text.textCursor()
                        scroll_pos = self.output_text.verticalScrollBar().value()
                        
                        # 텍스트 변환
                        self.convert_text()
                        
                        # 커서 위치와 스크롤 위치 복원
                        self.output_text.setTextCursor(cursor)
                        self.output_text.verticalScrollBar().setValue(scroll_pos)
                        
                        # UI 요소들 애니메이션 효과
                        for widget in self.findChildren(QWidget, "tag_container"):
                            # 페이드 효과
                            opacity_effect = QGraphicsOpacityEffect(widget)
                            widget.setGraphicsEffect(opacity_effect)
                            
                            animation = QPropertyAnimation(opacity_effect, b"opacity")
                            animation.setDuration(200)
                            animation.setStartValue(0.5)
                            animation.setEndValue(1.0)
                            animation.setEasingCurve(QEasingCurve.Type.OutCubic)
                            animation.start(QAbstractAnimation.DeletionPolicy.DeleteWhenStopped)
                            
                except Exception as e:
                    print(f"Preview update error: {str(e)}")
            
            # 타이머에 업데이트 함수 연결 및 시작
            self.preview_timer.timeout.connect(do_update)
            self.preview_timer.start(300)  # 300ms 디바운싱
            
        except Exception as e:
            print(f"Preview timer setup error: {str(e)}")


    def generate_html(self):
        try:
            # 현재 템플릿이 그라데이션 모던인지 확인
            template_name = self.template_combo.currentText()
            is_gradient = template_name == "그라데이션 모던"
            
            # 그라데이션 스타일 설정
            gradient_style = ""
            if is_gradient:
                gradient_style = f"""
                    background: linear-gradient(135deg, 
                        {self.gradient_start}, 
                        {self.gradient_end}
                    );
                """
            
            # HTML 생성
            html = f"""
            <div class="chat-container" style="{gradient_style}">
                <!-- 기존 HTML 내용 -->
                {self.generate_profile_html() if self.show_profile.isChecked() else ''}
                {self.generate_content_html()}
            </div>
            """
            
            return html
            
        except Exception as e:
            print(f"HTML 생성 중 오류 발생: {str(e)}")
            return ""

 

    def animate_widget(self, widget):
        """위젯 페이드 인 애니메이션"""
        try:
            # 투명도 효과
            opacity_effect = QGraphicsOpacityEffect(widget)
            widget.setGraphicsEffect(opacity_effect)
            
            # 애니메이션 설정
            animation = QPropertyAnimation(opacity_effect, b"opacity")
            animation.setDuration(200)
            animation.setStartValue(0.5)
            animation.setEndValue(1.0)
            animation.setEasingCurve(QEasingCurve.Type.OutCubic)
            
            # 애니메이션 시작
            animation.start(QAbstractAnimation.DeletionPolicy.DeleteWhenStopped)
            
        except Exception as e:
            print(f"Widget animation error: {str(e)}")

    def get_scrollbar_style(self):
        """스크롤바 스타일 반환"""
        return f"""
            QScrollArea {{
                background-color: {STYLES['background']};
                border: none;
            }}
            QScrollBar:vertical {{
                border: none;
                background-color: {STYLES['background']};
                width: 10px;
                margin: 0;
            }}
            QScrollBar::handle:vertical {{
                background-color: #A0A0A0;
                min-height: 30px;
                border-radius: 5px;
            }}
            QScrollBar::handle:vertical:hover {{
                background-color: #808080;
            }}
            QScrollBar::add-line:vertical,
            QScrollBar::sub-line:vertical {{
                height: 0px;
            }}
            QScrollBar::add-page:vertical,
            QScrollBar::sub-page:vertical {{
                background: none;
            }}
            QScrollBar:horizontal {{
                border: none;
                background-color: {STYLES['background']};
                height: 10px;
                margin: 0;
            }}
            QScrollBar::handle:horizontal {{
                background-color: #A0A0A0;
                min-width: 30px;
                border-radius: 5px;
            }}
            QScrollBar::handle:horizontal:hover {{
                background-color: #808080;
            }}
            QScrollBar::add-line:horizontal,
            QScrollBar::sub-line:horizontal {{
                width: 0px;
            }}
            QScrollBar::add-page:horizontal,
            QScrollBar::sub-page:horizontal {{
                background: none;
            }}
        """
    def create_settings_panel(self):
        """설정 패널 생성"""
        class MinSizeWidget(QWidget):
            def minimumSizeHint(self):
                return QSize(0, 0)
        
        panel = MinSizeWidget()
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(0, 0, 0, 0)
        
        # 스크롤 영역
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet(self.get_scrollbar_style())
        
        scroll_content = QWidget()
        scroll_layout = QVBoxLayout(scroll_content)
        scroll_layout.setSpacing(STYLES['spacing_large'])
        
        # 각 설정 그룹 생성
        template_group = self.create_template_settings()
        profile_group = self.create_profile_settings()
        tag_group = self.create_tag_settings()
        text_group = self.create_text_settings()
        word_replace_group = self.create_word_replace_settings()
        
        # 에셋 이미지 설정 그룹 추가
        asset_image_group = self.create_asset_image_settings()
        asset_group = self.create_asset_settings()
        
        # 설정 그룹들을 스크롤 레이아웃에 추가
        scroll_layout.addWidget(template_group)
        scroll_layout.addWidget(profile_group)
        scroll_layout.addWidget(tag_group)
        scroll_layout.addWidget(text_group)
        scroll_layout.addWidget(word_replace_group)
        scroll_layout.addWidget(asset_image_group)  # 새로 추가
        scroll_layout.addWidget(asset_group)
        
        scroll.setWidget(scroll_content)
        layout.addWidget(scroll)
        
        return panel

    def create_asset_image_settings(self):
        """에셋 이미지 설정 그룹 생성"""
        group = SettingsGroup("에셋 이미지 설정")
        
        # 이미지 크기 설정
        size_layout = QHBoxLayout()
        size_layout.addWidget(QLabel("이미지 크기:"))
        
        # 크기 안내 문구를 중앙에 배치
        size_info = QLabel("(기본: 100%, 10~100%)")
        size_info.setStyleSheet(f"color: {STYLES['text_secondary']};")
        size_layout.addWidget(size_info)
        
        # 스트레치로 남은 공간 채우기
        size_layout.addStretch()
        
        # 크기 입력을 오른쪽에 배치
        self.image_size = ModernSpinBox()
        self.image_size.setRange(10, 100)
        self.image_size.setValue(100)
        self.image_size.setSuffix("%")
        self.image_size.setFixedWidth(100)  # 너비 고정
        size_layout.addWidget(self.image_size)
        
        group.addLayout(size_layout)
        
        # 상하 여백 설정
        margin_layout = QHBoxLayout()
        margin_layout.addWidget(QLabel("상하 여백:"))
        
        # 여백 안내 문구를 중앙에 배치
        margin_info = QLabel("(기본: 10px, 0~50px)")
        margin_info.setStyleSheet(f"color: {STYLES['text_secondary']};")
        margin_layout.addWidget(margin_info)
        
        # 스트레치로 남은 공간 채우기
        margin_layout.addStretch()
        
        # 여백 입력을 오른쪽에 배치
        self.image_margin = ModernSpinBox()
        self.image_margin.setRange(0, 50)
        self.image_margin.setValue(10)
        self.image_margin.setSuffix("px")
        self.image_margin.setFixedWidth(100)  # 너비 고정
        margin_layout.addWidget(self.image_margin)
        
        group.addLayout(margin_layout)
        
        # 테두리 설정
        border_layout = QHBoxLayout()
        self.use_image_border = ModernCheckBox("테두리 사용")
        border_layout.addWidget(self.use_image_border)
        
        self.image_border_color = ModernColorButton("#000000")
        self.image_border_color.clicked.connect(lambda: self.choose_image_border_color())
        border_layout.addWidget(QLabel("테두리 색상:"))
        border_layout.addWidget(self.image_border_color)
        border_layout.addStretch()
        group.addLayout(border_layout)
        
        # 그림자 설정
        shadow_layout = QHBoxLayout()
        self.use_image_shadow = ModernCheckBox("그림자 효과")
        self.use_image_shadow.setChecked(True)
        shadow_layout.addWidget(self.use_image_shadow)
        shadow_layout.addStretch()
        group.addLayout(shadow_layout)
        
        return group

    def create_template_settings(self):
            """템플릿 및 구분선 설정 통합 그룹 생성"""
            group = SettingsGroup("템플릿 설정")
            
            # 프리셋 관리 버튼 컨테이너
            button_container = QWidget()
            button_layout = QHBoxLayout(button_container)
            button_layout.setContentsMargins(0, 0, 0, STYLES['spacing_normal'])
            
            # 프리셋 관리 버튼
            preset_btn = self.create_preset_button()
            button_layout.addWidget(preset_btn)
            button_layout.addStretch()
            group.addWidget(button_container)

            # 템플릿 선택
            template_container = QWidget()
            template_layout = QHBoxLayout(template_container)
            template_layout.setContentsMargins(0, 0, 0, STYLES['spacing_normal'])
            
            template_layout.addWidget(QLabel("템플릿"))
            self.template_combo = ModernComboBox()
            self.template_combo.addItems(self.template_manager.get_template_names())
            self.template_combo.currentTextChanged.connect(self.template_manager.apply_template)
            template_layout.addWidget(self.template_combo)
            
            group.addWidget(template_container)

            # 외부 박스 설정
            box_layout = QHBoxLayout()
            self.show_inner_box = ModernCheckBox("외부 박스 표시")
            self.show_inner_box.setChecked(False)
            self.show_inner_box.stateChanged.connect(self.update_preview)
            box_layout.addWidget(self.show_inner_box)
            box_layout.addStretch()
            group.addLayout(box_layout)

            # 색상 설정 컨테이너
            colors_container = QWidget()
            colors_layout = QVBoxLayout(colors_container)
            colors_layout.setSpacing(STYLES['spacing_small'])
            
            # 외부 박스 색상
            outer_box_layout = QHBoxLayout()
            outer_box_layout.addWidget(QLabel("외부 박스 색상"))
            self.outer_box_color = ModernColorButton(STYLES['outer_box_color'])
            self.outer_box_color.clicked.connect(lambda: self.choose_color("outer_box"))
            outer_box_layout.addWidget(self.outer_box_color)
            colors_layout.addLayout(outer_box_layout)
            
            # 내부 박스 색상
            inner_box_layout = QHBoxLayout()
            inner_box_layout.addWidget(QLabel("내부 박스 색상"))
            self.inner_box_color = ModernColorButton(STYLES['inner_box_color'])
            self.inner_box_color.clicked.connect(lambda: self.choose_color("inner_box"))
            inner_box_layout.addWidget(self.inner_box_color)
            colors_layout.addLayout(inner_box_layout)
            
            group.addWidget(colors_container)

            # 그림자 설정
            shadow_container = QWidget()
            shadow_layout = QHBoxLayout(shadow_container)
            shadow_layout.addWidget(QLabel("그림자 강도"))

            self.shadow_intensity = ModernSpinBox()
            self.shadow_intensity.setRange(0, 40)
            self.shadow_intensity.setValue(STYLES['shadow_intensity'])
            self.shadow_intensity.valueChanged.connect(self.update_preview)
            shadow_layout.addWidget(self.shadow_intensity)

            # 그림자 설명 레이블
            shadow_info = QLabel("(0~40px)")
            shadow_info.setStyleSheet(f"color: {STYLES['text_secondary']};")
            shadow_layout.addWidget(shadow_info)
            shadow_layout.addStretch()

            group.addWidget(shadow_container)
            shadow_container.setVisible(False)  # 컨테이너를 숨김

            # 테두리 설정 섹션 추가
            border_section = QWidget()
            border_layout = QVBoxLayout(border_section)
            border_layout.setSpacing(STYLES['spacing_small'])
            
            # 테두리 제목
            border_title = QLabel("로그박스 테두리 설정")
            border_layout.addWidget(border_title)

            # 테두리 사용 체크박스
            self.use_box_border = ModernCheckBox("테두리 사용")
            self.use_box_border.setChecked(False)
            self.use_box_border.stateChanged.connect(self.update_border_settings)
            border_layout.addWidget(self.use_box_border)

            # 테두리 설정 컨테이너
            self.border_settings = QWidget()
            border_settings_layout = QVBoxLayout(self.border_settings)
            border_settings_layout.setSpacing(STYLES['spacing_small'])
            border_settings_layout.setContentsMargins(20, 0, 0, 0)  # 왼쪽 들여쓰기

            # 테두리 색상 설정
            border_color_layout = QHBoxLayout()
            border_color_layout.addWidget(QLabel("테두리 색상"))
            self.box_border_color = ModernColorButton("#CCCCCC")  # 기본 회색
            self.box_border_color.clicked.connect(lambda: self.choose_color("box_border"))
            border_color_layout.addWidget(self.box_border_color)
            border_settings_layout.addLayout(border_color_layout)

            # 테두리 굵기 설정
            border_thickness_layout = QHBoxLayout()
            border_thickness_layout.addWidget(QLabel("테두리 굵기"))
            self.box_border_thickness = ModernSpinBox()
            self.box_border_thickness.setRange(1, 8)
            self.box_border_thickness.setValue(2)
            self.box_border_thickness.setSuffix("px")
            self.box_border_thickness.setFixedWidth(70)
            border_thickness_layout.addWidget(self.box_border_thickness)
            
            # 굵기 설명 레이블
            thickness_info = QLabel("(1~8px)")
            thickness_info.setStyleSheet(f"color: {STYLES['text_secondary']};")
            border_thickness_layout.addWidget(thickness_info)
            border_thickness_layout.addStretch()
            
            border_settings_layout.addLayout(border_thickness_layout)
            
            border_layout.addWidget(self.border_settings)
            group.addWidget(border_section)
            
            # 초기 테두리 설정 상태 업데이트
            self.update_border_settings(self.use_box_border.isChecked())

            return group

    def update_border_settings(self, enabled):
        """테두리 설정 상태 업데이트"""
        self.border_settings.setEnabled(enabled)
        self.update_preview()

    def save_current_template(self):
        """현재 설정을 새 템플릿으로 저장"""
        name, ok = QInputDialog.getText(
            self,
            '템플릿 저장',
            '새 템플릿 이름을 입력하세요:',
            text='새 템플릿'
        )
        
        if ok and name:
            if name in self.template_manager.get_template_names():
                reply = QMessageBox.question(
                    self,
                    '템플릿 덮어쓰기',
                    f'"{name}" 템플릿이 이미 존재합니다. 덮어쓰시겠습니까?',
                    QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
                )
                
                if reply == QMessageBox.StandardButton.No:
                    return
            
            # 그림자 강도 값도 포함하여 저장
            if self.template_manager.save_current_as_template(name, self.shadow_intensity.value()):
                # 콤보박스 업데이트
                current_items = [self.template_combo.itemText(i) 
                            for i in range(self.template_combo.count())]
                if name not in current_items:
                    self.template_combo.addItem(name)
                
                QMessageBox.information(
                    self,
                    '저장 완료',
                    f'템플릿 "{name}"이(가) 저장되었습니다.'
                )
                
                # 새로 저장된 템플릿 선택
                self.template_combo.setCurrentText(name)

    def apply_template(self, template_name):
        """템플릿 적용"""
        if self.template_manager.apply_template(template_name):
            # 그림자 강도도 템플릿에서 가져와서 적용
            shadow_intensity = self.template_manager.get_shadow_intensity(template_name)
            if shadow_intensity is not None:
                self.shadow_intensity.setValue(shadow_intensity)
            self.update_preview()

    def update_box_settings(self, show_outer_box):
        """박스 설정 UI 업데이트"""
        self.outer_box_container.setVisible(show_outer_box)
        self.inner_box_container.setVisible(show_outer_box)
        self.single_box_container.setVisible(not show_outer_box)
        
        # 외부 박스가 비활성화될 때 단일 박스 색상을 내부 박스 색상으로 설정
        if not show_outer_box:
            self.single_box_color.setColor(self.inner_box_color.get_color())


    def apply_template(self):
        """선택된 템플릿 적용"""
        try:
            template_name = self.template_combo.currentText()
            
            # TemplateManager에서 템플릿 정보 가져오기
            if template_name in self.template_manager.templates:
                template = self.template_manager.templates[template_name]
                
                # 템플릿의 색상 정보 가져오기
                colors = template["theme"]["colors"]
                
                # 각 색상 설정 적용
                self.outer_box_color.setColor(colors["outer_box"])
                self.inner_box_color.setColor(colors["inner_box"])
                self.bot_name_color.setColor(colors["bot_name"])
                self.profile_border_color.setColor(colors["profile_border"])
                self.dialog_color.setColor(colors["dialog"])
                self.narration_color.setColor(colors["narration"])
                self.divider_outer_color.setColor(colors["divider_outer"])
                self.divider_inner_color.setColor(colors["divider_inner"])
                
                # 태그 색상 설정
                tags = template["theme"]["tags"]
                for i, tag_color in enumerate(self.tag_colors):
                    if i < len(tags):
                        tag_color.setColor(tags[i]["color"])
                
                # 미리보기 업데이트
                self.update_preview()
            else:
                QMessageBox.warning(
                    self,
                    "템플릿 오류",
                    f"템플릿 '{template_name}'을(를) 찾을 수 없습니다."
                )
                
        except Exception as e:
            QMessageBox.warning(
                self,
                "템플릿 적용 오류",
                f"템플릿 적용 중 오류가 발생했습니다: {str(e)}"
            )

    def create_profile_settings(self):
        """프로필 설정 그룹 생성"""
        group = SettingsGroup("프로필 설정")

        # 프로필 요소별 표시 설정
        profile_elements_layout = QVBoxLayout()
        
        # 전체 프로필 표시 설정
        show_profile_layout = QHBoxLayout()
        self.show_profile = ModernCheckBox("프로필 표시")
        self.show_profile.setChecked(True)
        self.show_profile.stateChanged.connect(self.update_profile_element_states)
        show_profile_layout.addWidget(self.show_profile)
        profile_elements_layout.addLayout(show_profile_layout)
        
        # 개별 요소 표시 설정
        elements_container = QWidget()
        elements_layout = QVBoxLayout(elements_container)
        elements_layout.setContentsMargins(20, 0, 0, 0)  # 왼쪽 들여쓰기

        # 봇 이름 설정
        bot_name_container = QWidget()
        bot_name_layout = QHBoxLayout(bot_name_container)
        bot_name_layout.setContentsMargins(0, 0, 0, 0)
        
        self.show_bot_name = ModernCheckBox("봇 이름 표시")
        self.show_bot_name.setChecked(True)
        bot_name_layout.addWidget(self.show_bot_name)
        
        self.bot_name = QLineEdit()
        self.bot_name.setPlaceholderText("봇 이름을 입력하세요")
        bot_name_layout.addWidget(self.bot_name)
        
        self.bot_name_color = ModernColorButton(STYLES['bot_name_color'])
        self.bot_name_color.clicked.connect(lambda: self.choose_color("bot_name"))
        bot_name_layout.addWidget(QLabel("색상"))
        bot_name_layout.addWidget(self.bot_name_color)
        
        elements_layout.addWidget(bot_name_container)
        
        # 프로필 이미지 표시 설정
        self.show_profile_image = ModernCheckBox("프로필 이미지 표시")
        self.show_profile_image.setChecked(True)
        elements_layout.addWidget(self.show_profile_image)
        
        # 태그 표시 설정
        self.show_tags = ModernCheckBox("태그 표시")
        self.show_tags.setChecked(True)
        elements_layout.addWidget(self.show_tags)
        
        # 구분선 표시 설정
        self.show_divider = ModernCheckBox("구분선 표시")
        self.show_divider.setChecked(True)
        self.show_divider.stateChanged.connect(self.update_divider_settings_state)
        elements_layout.addWidget(self.show_divider)
        
        profile_elements_layout.addWidget(elements_container)
        group.addLayout(profile_elements_layout)

        # 프레임 스타일 선택
        frame_style_layout = QHBoxLayout()
        frame_style_layout.addWidget(QLabel("프레임 스타일"))
        self.frame_style = ModernComboBox()
        self.frame_style.addItems(["배너", "동그라미", "직사각형"])
        self.frame_style.currentTextChanged.connect(self.update_size_inputs)
        frame_style_layout.addWidget(self.frame_style)
        group.addLayout(frame_style_layout)
        
        # 크기 제한 안내 라벨
        self.size_info_label = QLabel()
        self.size_info_label.setStyleSheet(f"color: {STYLES['text_secondary']};")
        group.addWidget(self.size_info_label)

        # 크기 설정
        size_group = QWidget()
        self.size_layout = QGridLayout(size_group)
        
        # 크기/너비 설정
        self.size_label = QLabel("크기")
        self.size_layout.addWidget(self.size_label, 0, 0)
        self.width_input = ModernSpinBox()
        self.width_input.setRange(20, 300)
        self.width_input.setValue(80)
        self.width_input.setSuffix("px")
        self.size_layout.addWidget(self.width_input, 0, 1)
        
        # 높이 설정
        self.height_label = QLabel("높이")
        self.size_layout.addWidget(self.height_label, 1, 0)
        self.height_input = ModernSpinBox()
        self.height_input.setRange(20, 300)
        self.height_input.setValue(80)
        self.height_input.setSuffix("px")
        self.size_layout.addWidget(self.height_input, 1, 1)
        
        group.addWidget(size_group)

        # URL 입력
        url_layout = QVBoxLayout()
        url_layout.addWidget(QLabel("이미지 URL"))
        self.image_url = QLineEdit()
        self.image_url.setPlaceholderText("<img src=\"//ac.namu.la/20241030sac/[해시값].png?expires=1730359671&key=[키값]\" class=\"fr-fic fr-dii\">")
        url_layout.addWidget(self.image_url)
        group.addLayout(url_layout)

        # 이미지 스타일 설정
        style_layout = QVBoxLayout()
        
        # 테두리 설정
        border_layout = QHBoxLayout()
        self.show_profile_border = ModernCheckBox("테두리 표시")
        self.show_profile_border.setChecked(True)
        border_layout.addWidget(self.show_profile_border)
        
        border_layout.addWidget(QLabel("색상"))
        self.profile_border_color = ModernColorButton(STYLES['profile_border_color'])
        self.profile_border_color.clicked.connect(lambda: self.choose_color("profile_border"))
        border_layout.addWidget(self.profile_border_color)
        style_layout.addLayout(border_layout)
        
        # 그림자 설정
        shadow_layout = QHBoxLayout()
        self.show_profile_shadow = ModernCheckBox("그림자 효과")
        self.show_profile_shadow.setChecked(True)
        shadow_layout.addWidget(self.show_profile_shadow)
        style_layout.addLayout(shadow_layout)
        
        group.addLayout(style_layout)

        # 구분선 설정 섹션 추가
        divider_section = QWidget()
        divider_layout = QVBoxLayout(divider_section)
        divider_layout.setSpacing(STYLES['spacing_small'])
        
        # 구분선 제목
        divider_title = QLabel("구분선 설정")
        divider_layout.addWidget(divider_title)

        # 구분선 설정 컨테이너
        self.divider_settings_container = QWidget()
        divider_settings_layout = QVBoxLayout(self.divider_settings_container)
        divider_settings_layout.setContentsMargins(20, 0, 0, 0)  # 왼쪽 들여쓰기

        # 스타일 선택
        style_layout = QHBoxLayout()
        style_layout.addWidget(QLabel("스타일"))
        self.divider_style = ModernComboBox()
        self.divider_style.addItems(["그라데이션", "단색"])
        self.divider_style.currentTextChanged.connect(self.toggle_divider_color_settings)
        style_layout.addWidget(self.divider_style)
        divider_settings_layout.addLayout(style_layout)

        # 굵기 설정
        thickness_layout = QHBoxLayout()
        thickness_layout.addWidget(QLabel("굵기"))
        self.divider_thickness = ModernSpinBox()  # ModernSpinBox 대신 QSpinBox 사용
        self.divider_thickness.setRange(1, 4)
        self.divider_thickness.setValue(1)
        self.divider_thickness.setSuffix("px")
        self.divider_thickness.setFixedWidth(70)
        thickness_layout.addWidget(self.divider_thickness)
        
        thickness_info = QLabel("(1~4px)")
        thickness_info.setStyleSheet(f"color: {STYLES['text_secondary']};")
        thickness_layout.addWidget(thickness_info)
        thickness_layout.addStretch()
        
        divider_settings_layout.addLayout(thickness_layout)

        # 그라데이션 설정
        self.gradient_settings = QWidget()
        gradient_layout = QVBoxLayout(self.gradient_settings)
        
        # 외부 색상
        outer_color_layout = QHBoxLayout()
        outer_color_layout.addWidget(QLabel("외부 색상"))
        self.divider_outer_color = ModernColorButton(STYLES['divider_outer_color'])
        self.divider_outer_color.clicked.connect(lambda: self.choose_color("divider_outer"))
        outer_color_layout.addWidget(self.divider_outer_color)
        gradient_layout.addLayout(outer_color_layout)
        
        # 내부 색상
        inner_color_layout = QHBoxLayout()
        inner_color_layout.addWidget(QLabel("내부 색상"))
        self.divider_inner_color = ModernColorButton(STYLES['divider_inner_color'])
        self.divider_inner_color.clicked.connect(lambda: self.choose_color("divider_inner"))
        inner_color_layout.addWidget(self.divider_inner_color)
        gradient_layout.addLayout(inner_color_layout)
        
        divider_settings_layout.addWidget(self.gradient_settings)
        
        # 단색 설정
        self.solid_settings = QWidget()
        solid_layout = QHBoxLayout(self.solid_settings)
        solid_layout.addWidget(QLabel("선 색상"))
        self.divider_solid_color = ModernColorButton(STYLES['divider_outer_color'])
        self.divider_solid_color.clicked.connect(lambda: self.choose_color("divider_solid"))
        solid_layout.addWidget(self.divider_solid_color)
        
        divider_settings_layout.addWidget(self.solid_settings)

        divider_layout.addWidget(self.divider_settings_container)
        group.addWidget(divider_section)

        # 초기 구분선 스타일 설정
        self.toggle_divider_color_settings(self.divider_style.currentText())
        self.update_divider_settings_state()

        # 구분선 추가
        line = QFrame()
        line.setFrameShape(QFrame.Shape.HLine)
        line.setStyleSheet(f"background-color: {STYLES['border']};")
        group.addWidget(line)

        # 프로필 관리 버튼들
        buttons_layout = QGridLayout()
        buttons_layout.setSpacing(8)  # 버튼 간격 설정

        # 프로필 저장 버튼
        save_btn = ModernButton("프로필 저장")
        save_btn.clicked.connect(self.profile_manager.save_profile_set_dialog)
        buttons_layout.addWidget(save_btn, 0, 0)
        
        # 프로필 불러오기 버튼
        load_btn = ModernButton("프로필 불러오기")
        load_btn.clicked.connect(self.profile_manager.load_profile_set_dialog)
        buttons_layout.addWidget(load_btn, 0, 1)
        
        # 프로필 삭제 버튼
        delete_btn = ModernButton("프로필 삭제")
        delete_btn.clicked.connect(self.profile_manager.delete_profile_set_dialog)
        buttons_layout.addWidget(delete_btn, 1, 0, 1, 2)

        group.addLayout(buttons_layout)

        # 초기 상태 설정
        self.update_size_inputs(self.frame_style.currentText())
        self.update_profile_element_states()
        self.update_profile_style_states()
        
        return group

    def update_divider_settings_state(self):
        """구분선 설정 상태 업데이트"""
        is_divider_enabled = self.show_divider.isChecked()
        self.divider_settings_container.setEnabled(is_divider_enabled)

    def update_profile_element_states(self):
        """프로필 요소들의 활성화 상태 업데이트"""
        is_profile_enabled = self.show_profile.isChecked()
        
        # 하위 요소들의 체크박스 활성화/비활성화
        self.show_profile_image.setEnabled(is_profile_enabled)
        self.show_bot_name.setEnabled(is_profile_enabled)
        self.show_tags.setEnabled(is_profile_enabled)
        self.show_divider.setEnabled(is_profile_enabled)
        
        # 프로필 이미지 관련 UI 요소들
        self.frame_style.setEnabled(is_profile_enabled and self.show_profile_image.isChecked())
        self.width_input.setEnabled(is_profile_enabled and self.show_profile_image.isChecked())
        self.height_input.setEnabled(is_profile_enabled and self.show_profile_image.isChecked())
        self.image_url.setEnabled(is_profile_enabled and self.show_profile_image.isChecked())
        self.profile_border_color.setEnabled(is_profile_enabled and self.show_profile_image.isChecked())

    def update_size_inputs(self, style):
        """프레임 스타일에 따라 기본 크기값과 권장 사이즈 정보 업데이트"""
        if style == "동그라미":
            # 동그라미는 크기 입력만 표시
            self.size_label.setText("크기")
            self.size_label.show()
            self.width_input.show()
            self.width_input.setValue(80)
            self.width_input.setEnabled(True)
            self.height_label.hide()
            self.height_input.hide()
            size_info = "※ 크기 20~300px\n권장 이미지: 200x200px 정사각형"
            
        elif style == "배너":
            # 배너는 모든 크기 조절 UI 숨김
            self.size_label.hide()
            self.width_input.hide()
            self.height_label.hide()
            self.height_input.hide()
            size_info = "※ 권장 이미지: 1200x400px (3:1 비율)"
            
        else:  # 직사각형
            self.size_label.setText("크기")
            self.size_label.show()
            self.width_input.show()
            self.width_input.setValue(120)
            self.width_input.setEnabled(True)
            self.height_label.show()
            self.height_input.show()
            self.height_input.setValue(80)
            size_info = "※ 크기 제한: 20~300px\n권장 이미지: 300x200px (3:2 비율)"
        
        # 권장 사이즈 정보를 보여주는 레이블 스타일 설정
        self.size_info_label.setText(size_info)
        self.size_info_label.setStyleSheet(f"""
            color: {STYLES['text_secondary']};
            font-size: 12px;
            padding: 8px;
            background-color: {STYLES['surface']};
            border-radius: 4px;
            margin-top: 4px;
        """)

    def create_tag_settings(self):
        """태그 설정 그룹 생성"""
        group = SettingsGroup("태그 설정")

        # 스크롤 영역 생성 및 스타일 설정
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet(f"""
            QScrollArea {{
                border: 1px solid {STYLES['border']};
                border-radius: {STYLES['radius_normal']}px;
                background: {STYLES['background']};
                min-height: 200px;
            }}
            QWidget {{
                background: {STYLES['background']};
            }}
            {self.get_scrollbar_style()}
        """)
        
        # 스크롤 영역의 크기 설정
        scroll.setMinimumHeight(400)
        scroll.setMaximumHeight(600)
        
        # 태그 컨테이너 설정
        self.tag_container = QWidget()
        self.tag_layout = QVBoxLayout(self.tag_container)
        self.tag_layout.setSpacing(1)
        self.tag_layout.setContentsMargins(10, 10, 10, 10)
        scroll.setWidget(self.tag_container)
        
        group.addWidget(scroll)

        # 기본 태그 3개 추가
        default_tags = [
            {"text": "모델", "color": "#E3E3E8", "text_color": "#000000", "style": "기본"},
            {"text": "프롬프트", "color": "#E3E3E8", "text_color": "#000000", "style": "기본"},
            {"text": "번역", "color": "#E3E3E8", "text_color": "#000000", "style": "기본"}
        ]
        
        for tag_data in default_tags:
            self.add_new_tag(tag_data)

        # 버튼들을 위한 컨테이너
        buttons_container = QWidget()
        buttons_layout = QVBoxLayout(buttons_container)
        buttons_layout.setSpacing(8)  # 버튼 간격 설정
        buttons_layout.setContentsMargins(0, 10, 0, 0)  # 위쪽 여백 추가

        # 태그 추가 버튼
        add_btn = ModernButton("+ 태그 추가")
        add_btn.clicked.connect(lambda: self.add_new_tag())
        buttons_layout.addWidget(add_btn)

        # 구분선 추가
        line = QFrame()
        line.setFrameShape(QFrame.Shape.HLine)
        line.setStyleSheet(f"background-color: {STYLES['border']};")
        buttons_layout.addWidget(line)

        # 태그 관리 버튼들을 위한 그리드 레이아웃
        tag_management_layout = QGridLayout()
        tag_management_layout.setSpacing(8)  # 버튼 간격 설정

        # 태그 저장 버튼
        save_btn = ModernButton("태그 저장")
        save_btn.clicked.connect(self.tag_manager.save_tag_set_dialog)
        tag_management_layout.addWidget(save_btn, 0, 0)
        
        # 태그 불러오기 버튼
        load_btn = ModernButton("태그 불러오기")
        load_btn.clicked.connect(self.tag_manager.load_tag_set_dialog)
        tag_management_layout.addWidget(load_btn, 0, 1)
        
        # 태그 삭제 버튼
        delete_btn = ModernButton("태그 삭제")
        delete_btn.clicked.connect(self.tag_manager.delete_tag_set_dialog)
        tag_management_layout.addWidget(delete_btn, 1, 0, 1, 2)  # 마지막 버튼은 전체 너비 사용

        # 그리드 레이아웃을 메인 버튼 레이아웃에 추가
        buttons_layout.addLayout(tag_management_layout)
        
        # 버튼 컨테이너를 그룹에 추가
        group.addWidget(buttons_container)
        
        return group

    def add_new_tag(self, tag_data=None):
        """새 태그 추가 (초기 데이터 지원)"""
        entry = TagEntry(self.tag_container)
        if tag_data:
            entry.load_style_dict(tag_data)
        self.tag_layout.addWidget(entry)  # 레이아웃에 위젯 추가
        self.tag_container.update()  # 레이아웃 갱신


    def show_tag_preset_menu(self):
        """태그 프리셋 메뉴 표시"""
        menu = QMenu(self)
        
        # 현재 태그 설정 저장
        save_action = menu.addAction("현재 태그 설정 저장")
        save_action.triggered.connect(self.save_tag_preset)
        
        # 저장된 프리셋이 있으면 구분선과 프리셋 메뉴 추가
        if self.tag_presets:
            menu.addSeparator()
            preset_menu = menu.addMenu("프리셋 불러오기")
            for name in self.tag_presets.keys():
                action = preset_menu.addAction(name)
                action.triggered.connect(lambda checked, n=name: self.load_tag_preset(n))
        
        menu.exec(QCursor.pos())

    def save_tag_preset(self):
        """현재 태그 설정을 프리셋으로 저장"""
        name, ok = QInputDialog.getText(self, '태그 프리셋 저장', '프리셋 이름을 입력하세요:')
        if ok and name:
            # 현재 태그 설정 수집
            tags = []
            for i in range(self.tag_layout.count()):
                widget = self.tag_layout.itemAt(i).widget()
                if isinstance(widget, TagEntry):
                    tags.append(widget.get_style_dict())
            
            # 전역 설정도 포함
            preset_data = {
                'tags': tags,
            }
            
            # 프리셋 저장
            self.tag_presets[name] = preset_data
            self.save_tag_presets_to_file()
            
            QMessageBox.information(self, '저장 완료', f'태그 프리셋 "{name}"이(가) 저장되었습니다.')

    def load_tag_preset(self, name):
        if name not in self.tag_presets:
            return
        
        preset_data = self.tag_presets[name]
        
        self.clear_tags()
        for tag_data in preset_data['tags']:
            self.add_new_tag(tag_data)
        
        self.tag_container.update()  # 최종 레이아웃 갱신



    def clear_tags(self):
        """모든 태그 제거"""
        while self.tag_layout.count():
            widget = self.tag_layout.takeAt(0).widget()
            if widget:
                widget.deleteLater()
        self.tag_container.update()  # 레이아웃 갱신


    def sort_tags(self):
        """태그 정렬"""
        # 현재 태그 데이터 수집
        tags = []
        while self.tag_layout.count():
            widget = self.tag_layout.takeAt(0).widget()
            if isinstance(widget, TagEntry):
                tags.append(widget.get_style_dict())
                widget.deleteLater()
        
        # 태그 텍스트 기준으로 정렬
        tags.sort(key=lambda x: x['text'])
        
        # 정렬된 태그 다시 추가
        for tag_data in tags:
            self.add_new_tag(tag_data)

    def create_text_settings(self):
        """텍스트 설정 그룹 생성"""
        group = SettingsGroup("텍스트 설정")
        
        # 텍스트 설정 매니저 초기화
        self.text_settings_manager = TextSettingsManager(self)
        
        # 설정 관리 버튼 컨테이너
        buttons_container = QWidget()
        buttons_layout = QHBoxLayout(buttons_container)
        buttons_layout.setContentsMargins(0, 0, 0, STYLES['spacing_normal'])
        
        # 설정 저장 버튼
        save_btn = ModernButton("설정 저장")
        save_btn.clicked.connect(self.text_settings_manager.save_current_settings)
        buttons_layout.addWidget(save_btn)
        
        # 설정 불러오기 버튼
        load_btn = ModernButton("설정 불러오기")
        load_btn.clicked.connect(self.show_text_settings_menu)
        buttons_layout.addWidget(load_btn)
        
        buttons_layout.addStretch()
        group.addWidget(buttons_container)
        
        # 들여쓰기 컨테이너
        indent_container = QWidget()
        indent_layout = QVBoxLayout(indent_container)
        indent_layout.setSpacing(STYLES['spacing_small'])
        
        # 들여쓰기 활성화 체크박스
        self.use_text_indent = ModernCheckBox("문단 들여쓰기 사용")
        self.use_text_indent.setChecked(True)  # 기본값은 활성화
        self.use_text_indent.stateChanged.connect(self.update_indent_state)
        indent_layout.addWidget(self.use_text_indent)
        
        # 들여쓰기 크기 설정
        indent_size_layout = QHBoxLayout()
        indent_size_layout.setContentsMargins(20, 0, 0, 0)  # 왼쪽 여백으로 하위 설정임을 표시
        
        indent_size_layout.addWidget(QLabel("들여쓰기 크기"))
        self.text_indent = ModernSpinBox()
        self.text_indent.setRange(0, 100)  # 범위 설정
        self.text_indent.setValue(STYLES['text_indent'])
        self.text_indent.setSuffix("px")
        indent_size_layout.addWidget(self.text_indent)
        indent_layout.addLayout(indent_size_layout)
        
        # 들여쓰기 크기 제한 안내
        indent_info = QLabel("※ 들여쓰기 0~100px")
        indent_info.setStyleSheet(f"color: {STYLES['text_secondary']};")
        indent_info.setContentsMargins(20, 0, 0, 0)  # 왼쪽 여백 추가
        indent_layout.addWidget(indent_info)
        
        group.addWidget(indent_container)
        
        # 텍스트 크기 설정
        text_size_container = QWidget()
        text_size_layout = QVBoxLayout(text_size_container)
        text_size_layout.setSpacing(STYLES['spacing_small'])
        
        # 텍스트 크기 활성화 체크박스
        self.use_text_size = ModernCheckBox("텍스트 크기 조절 사용")
        self.use_text_size.setChecked(True)
        self.use_text_size.stateChanged.connect(self.update_text_size_state)
        text_size_layout.addWidget(self.use_text_size)
        
        # 텍스트 크기 설정
        text_size_control_layout = QHBoxLayout()
        text_size_control_layout.setContentsMargins(20, 0, 0, 0)  # 왼쪽 여백으로 하위 설정임을 표시
        
        text_size_control_layout.addWidget(QLabel("텍스트 크기"))
        self.text_size = ModernSpinBox()
        self.text_size.setRange(8, 24)  # 범위 설정
        self.text_size.setValue(14)  # 기본값 14px
        self.text_size.setSuffix("px")
        text_size_control_layout.addWidget(self.text_size)
        text_size_layout.addLayout(text_size_control_layout)
        
        text_size_info = QLabel("※ 텍스트 크기 8~24px\n로그 제조기 기본값 14px\n아카라이브 기본값 15px")
        text_size_info.setStyleSheet(f"color: {STYLES['text_secondary']};")
        text_size_info.setContentsMargins(20, 0, 0, 0)  # 왼쪽 여백 추가
        text_size_layout.addWidget(text_size_info)
        
        group.addWidget(text_size_container)

        # 대화문 색상 및 스타일
        dialog_settings = QWidget()
        dialog_layout = QVBoxLayout(dialog_settings)
        dialog_layout.setSpacing(STYLES['spacing_small'])
        
        # 대화문 헤더
        dialog_header = QLabel("대화문 설정")
        dialog_header.setStyleSheet(f"color: {STYLES['text']}; font-weight: bold;")
        dialog_layout.addWidget(dialog_header)
        
        # 대화문 색상
        dialog_color_layout = QHBoxLayout()
        dialog_color_layout.setContentsMargins(20, 0, 0, 0)
        dialog_color_layout.addWidget(QLabel("대화문 색상"))
        self.dialog_color = ModernColorButton(STYLES['dialog_color'])
        self.dialog_color.clicked.connect(lambda: self.choose_color("dialog"))
        dialog_color_layout.addWidget(self.dialog_color)
        dialog_layout.addLayout(dialog_color_layout)
        
        # 대화문 설정에 줄바꿈 토글 추가
        dialog_bold_layout = QHBoxLayout()
        dialog_bold_layout.setContentsMargins(20, 0, 0, 0)
        self.dialog_bold = ModernCheckBox("대화문 굵게")
        self.dialog_bold.setChecked(True)
        dialog_bold_layout.addWidget(self.dialog_bold)
        
        # 대화문 줄바꿈 설정 추가
        self.dialog_newline = ModernCheckBox("대화문 줄바꿈")
        self.dialog_newline.setChecked(True)  # 기본값 On
        dialog_bold_layout.addWidget(self.dialog_newline)
        dialog_layout.addLayout(dialog_bold_layout)
        
        group.addWidget(dialog_settings)

        # 속마음 설정 추가
        inner_thoughts_settings = QWidget()
        inner_thoughts_layout = QVBoxLayout(inner_thoughts_settings)
        inner_thoughts_layout.setSpacing(STYLES['spacing_small'])
        
        # 속마음 헤더
        inner_thoughts_header = QLabel("속마음 설정")
        inner_thoughts_layout.addWidget(inner_thoughts_header)
        
        # 속마음 색상
        inner_thoughts_color_layout = QHBoxLayout()
        inner_thoughts_color_layout.setContentsMargins(20, 0, 0, 0)
        inner_thoughts_color_layout.addWidget(QLabel("속마음 색상"))
        self.inner_thoughts_color = ModernColorButton(STYLES['dialog_color'])
        self.inner_thoughts_color.clicked.connect(lambda: self.choose_color("inner_thoughts"))
        inner_thoughts_color_layout.addWidget(self.inner_thoughts_color)
        inner_thoughts_layout.addLayout(inner_thoughts_color_layout)
        
        # 속마음 굵기 설정 수정 (기본값 Off)
        inner_thoughts_bold_layout = QHBoxLayout()
        inner_thoughts_bold_layout.setContentsMargins(20, 0, 0, 0)
        self.inner_thoughts_bold = ModernCheckBox("속마음 굵게")
        self.inner_thoughts_bold.setChecked(False)  # 기본값을 False로 변경
        inner_thoughts_bold_layout.addWidget(self.inner_thoughts_bold)
        inner_thoughts_layout.addLayout(inner_thoughts_bold_layout)
        
        group.addWidget(inner_thoughts_settings)

        # 나레이션 색상
        narration_settings = QWidget()
        narration_layout = QVBoxLayout(narration_settings)
        narration_layout.setSpacing(STYLES['spacing_small'])
        
        # 나레이션 헤더
        narration_header = QLabel("나레이션 설정")
        narration_header.setStyleSheet(f"color: {STYLES['text']}; font-weight: bold;")
        narration_layout.addWidget(narration_header)
        
        # 나레이션 색상 설정
        narration_color_layout = QHBoxLayout()
        narration_color_layout.setContentsMargins(20, 0, 0, 0)
        narration_color_layout.addWidget(QLabel("나레이션 색상"))
        self.narration_color = ModernColorButton(STYLES['narration_color'])
        self.narration_color.clicked.connect(lambda: self.choose_color("narration"))
        narration_color_layout.addWidget(self.narration_color)
        narration_layout.addLayout(narration_color_layout)
        
        group.addWidget(narration_settings)
        
        # 전처리 옵션
        preprocess_layout = QVBoxLayout()
        self.remove_asterisk = ModernCheckBox("에스터리스크(*) 제거")
        self.remove_asterisk.setChecked(True)
        preprocess_layout.addWidget(self.remove_asterisk)

        # 말줄임표 자동 변환
        self.convert_ellipsis = ModernCheckBox("말줄임표 자동 변환 (...→…)")
        self.convert_ellipsis.setChecked(True)
        preprocess_layout.addWidget(self.convert_ellipsis)

        group.addLayout(preprocess_layout)
        
        # 초기 들여쓰기 상태 설정
        self.update_indent_state()
        
        return group


    def show_text_settings_menu(self):
        """텍스트 설정 관리 메뉴 표시"""
        menu = QMenu(self)
        
        if self.text_settings_manager.settings:
            # 저장된 설정 불러오기 메뉴
            load_menu = menu.addMenu("설정 불러오기")
            delete_menu = menu.addMenu("설정 삭제")
            
            for name in sorted(self.text_settings_manager.settings.keys()):
                # 불러오기 메뉴
                load_action = load_menu.addAction(name)
                load_action.triggered.connect(
                    lambda checked, n=name: self.text_settings_manager.load_settings_by_name(n)
                )
                
                # 삭제 메뉴
                delete_action = delete_menu.addAction(name)
                delete_action.triggered.connect(
                    lambda checked, n=name: self.text_settings_manager.delete_settings(n)
                )
        else:
            no_settings_action = menu.addAction("저장된 설정 없음")
            no_settings_action.setEnabled(False)
        
        menu.exec(QCursor.pos())


    def update_indent_state(self):
        """들여쓰기 설정 상태 업데이트"""
        is_indent_enabled = self.use_text_indent.isChecked()
        self.text_indent.setEnabled(is_indent_enabled)    

    def create_word_replace_settings(self):
        """단어 변경 설정 그룹 생성"""
        group = SettingsGroup("단어 변경")
        
        # 단어 변경 입력 컨테이너
        self.word_replace_container = QWidget()
        self.word_replace_layout = QVBoxLayout(self.word_replace_container)
        self.word_replace_layout.setSpacing(STYLES['spacing_small'])
        
        # 기본 항목 3개 추가
        for _ in range(3):
            self.add_word_replace_entry()
        
        group.addWidget(self.word_replace_container)
        
        # 버튼 컨테이너
        buttons_container = QWidget()
        buttons_layout = QVBoxLayout(buttons_container)
        buttons_layout.setSpacing(8)
        
        # 항목 추가 버튼
        add_btn = ModernButton("+ 항목 추가")
        add_btn.clicked.connect(self.add_word_replace_entry)
        buttons_layout.addWidget(add_btn)

        # 구분선
        line = QFrame()
        line.setFrameShape(QFrame.Shape.HLine)
        line.setStyleSheet(f"background-color: {STYLES['border']};")
        buttons_layout.addWidget(line)

        # 단어 변경 세트 관리 버튼들
        management_layout = QGridLayout()
        management_layout.setSpacing(8)
        
        # 저장 버튼
        save_btn = ModernButton("단어 변경 저장")
        save_btn.clicked.connect(self.word_replace_manager.save_word_set_dialog)
        management_layout.addWidget(save_btn, 0, 0)
        
        # 불러오기 버튼
        load_btn = ModernButton("단어 변경 불러오기")
        load_btn.clicked.connect(self.word_replace_manager.load_word_set_dialog)
        management_layout.addWidget(load_btn, 0, 1)
        
        # 삭제 버튼
        delete_btn = ModernButton("단어 변경 삭제")
        delete_btn.clicked.connect(self.word_replace_manager.delete_word_set_dialog)
        management_layout.addWidget(delete_btn, 1, 0, 1, 2)  # 마지막 버튼은 전체 너비 사용
        
        buttons_layout.addLayout(management_layout)
        group.addWidget(buttons_container)
        
        return group


    def create_asset_settings(self):
        """에셋 관리 설정 그룹 생성"""
        group = SettingsGroup("에셋 관리")
        
        # 스크롤 영역 생성
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet(self.get_scrollbar_style())
        scroll.setMinimumHeight(300)  # 최소 높이 설정
        scroll.setMaximumHeight(600)  # 최대 높이 설정
        
        # 스크롤 내용물을 담을 위젯
        scroll_content = QWidget()
        content_layout = QVBoxLayout(scroll_content)
        content_layout.setSpacing(STYLES['spacing_small'])
        
        # 캐릭터 카드 업로드 영역
        upload_layout = QHBoxLayout()
        self.upload_card_btn = ModernButton("캐릭터 카드 업로드")
        self.upload_card_btn.clicked.connect(self.upload_character_card)
        upload_layout.addWidget(self.upload_card_btn)
        
        self.open_assets_btn = ModernButton("에셋 폴더 열기")
        self.open_assets_btn.clicked.connect(self.open_assets_folder)
        self.open_assets_btn.setEnabled(False)
        upload_layout.addWidget(self.open_assets_btn)
        content_layout.addLayout(upload_layout)

        # 상태 표시를 업로드 버튼 바로 아래에 배치
        self.asset_status = QLabel()
        self.asset_status.setStyleSheet(f"color: {STYLES['text_secondary']};")
        self.asset_status.setWordWrap(True)
        content_layout.addWidget(self.asset_status)
        
        # 구분선 추가
        line = QFrame()
        line.setFrameShape(QFrame.Shape.HLine)
        line.setStyleSheet(f"background-color: {STYLES['border']};")
        content_layout.addWidget(line)
        
        # 모든 버튼을 담을 컨테이너
        buttons_container = QWidget()
        buttons_layout = QVBoxLayout(buttons_container)
        buttons_layout.setSpacing(STYLES['spacing_small'])
        
        # 매핑 관리 버튼들을 수평으로 배치
        mapping_buttons = QWidget()
        mapping_layout = QHBoxLayout(mapping_buttons)
        mapping_layout.setContentsMargins(0, 0, 0, 0)
        
        # 매핑 저장 버튼
        save_btn = ModernButton("매핑 저장")
        save_btn.clicked.connect(lambda: self.mapping_manager.save_mapping_set_dialog())
        mapping_layout.addWidget(save_btn)
        
        # 매핑 불러오기 버튼
        load_btn = ModernButton("매핑 불러오기")
        load_btn.clicked.connect(lambda: self.mapping_manager.load_mapping_set_dialog())
        mapping_layout.addWidget(load_btn)
        
        # 매핑 삭제 버튼
        delete_btn = ModernButton("매핑 삭제")
        delete_btn.clicked.connect(lambda: self.mapping_manager.delete_mapping_set_dialog())
        mapping_layout.addWidget(delete_btn)

        # 매핑 초기화 버튼
        reset_btn = ModernButton("매핑 초기화")
        reset_btn.clicked.connect(self.reset_mappings)
        mapping_layout.addWidget(reset_btn)
        
        buttons_layout.addWidget(mapping_buttons)
        
        # URL 일괄 입력 버튼 (매핑 버튼들 아래에 배치)
        bulk_input_btn = ModernButton("URL 일괄 입력")
        bulk_input_btn.clicked.connect(lambda: self.create_bulk_url_input_dialog().exec())
        buttons_layout.addWidget(bulk_input_btn)
        
        # URL 항목 추가 버튼 (일괄 입력 버튼 아래에 배치)
        add_btn = ModernButton("+ URL 항목 추가")
        add_btn.clicked.connect(self.add_image_url_entry)
        buttons_layout.addWidget(add_btn)
        
        content_layout.addWidget(buttons_container)
        
        # 이미지 URL 매핑 컨테이너
        self.image_url_container = QWidget()
        self.image_url_layout = QVBoxLayout(self.image_url_container)
        self.image_url_layout.setSpacing(STYLES['spacing_small'])
        
        # 기본 항목 추가
        for _ in range(3):
            self.add_image_url_entry()
        
        content_layout.addWidget(self.image_url_container)
        
        # 스트레치 추가하여 내용물을 위로 정렬
        content_layout.addStretch()
        
        # 스크롤 영역에 내용물 설정
        scroll.setWidget(scroll_content)
        
        # 메인 레이아웃에 스크롤 영역 추가
        group.addWidget(scroll)
        
        return group

    def choose_image_border_color(self):
        """이미지 테두리 색상 선택"""
        color = QColorDialog.getColor()
        if color.isValid():
            self.image_border_color.setColor(color.name())

    def get_image_style_settings(self):
        """이미지 스타일 설정 반환"""
        return {
            'size': self.image_size.value(),
            'margin': self.image_margin.value(),
            'use_border': self.use_image_border.isChecked(),
            'border_color': self.image_border_color.get_color(),
            'use_shadow': self.use_image_shadow.isChecked()
        }

    def extract_url_from_html(self, html_text):
        """HTML 텍스트에서 이미지 URL 추출"""
        try:
            # 이미지 태그에서 URL 추출
            url_match = re.search(r'src=["\'](.*?)["\']', html_text)
            if url_match:
                url = url_match.group(1)
                
                # 프로토콜이 없는 URL 처리
                if url.startswith('//'):
                    url = 'https:' + url
                
                # HTML 엔티티 디코딩
                url = re.sub(r'&amp;', '&', url)
                
                return url.strip()
            return None
        except Exception as e:
            print(f"URL 추출 중 오류 발생: {str(e)}")
            return None

    def save_image_mapping(self, tag, url):
        """이미지 URL 매핑 저장"""
        self.image_cache.mappings[tag] = url
        self.image_cache.save_mappings()

    def load_image_mapping(self, tag):
        """이미지 URL 매핑 불러오기"""
        return self.image_cache.mappings.get(tag)

    def add_image_url_entry(self):
        """이미지 URL 입력 항목 추가"""
        entry = ImageUrlEntry(self.image_url_container)

        # 태그 입력 시 자동으로 캐시된 URL 검색
        def check_cached_url():
            tag = entry.tag_input.text().strip()
            if tag:
                cached_url = self.load_image_mapping(tag)
                if cached_url:
                    entry.url_input.setText(cached_url)
        
        entry.tag_input.editingFinished.connect(check_cached_url)
        
        # URL 입력 시 자동으로 캐시 저장
        def cache_url():
            tag = entry.tag_input.text().strip()
            url = entry.url_input.text().strip()
            if tag and url:
                self.save_image_mapping(tag, url)
        
        entry.url_input.editingFinished.connect(cache_url)
        
        self.image_url_layout.addWidget(entry)
            
        # 레이아웃 업데이트 및 스크롤 영역 조정
        self.image_url_container.adjustSize()
        if hasattr(self, 'asset_status'):
            self.asset_status.setText(
                "사용 방법:\n"
                "1. 이미지 태그에 식별자를 입력하세요 (예: character_happy)\n"
                "2. 해당하는 이미지 URL을 입력하세요\n"
                "3. 본문에서 다음과 같이 사용하세요:\n"
                "   - <img src=\"character_happy\">\n"
                "   - {{img::\"character_happy\"}}\n"
                "   - [img:character_happy]"
            )
        
        # URL 입력 시 자동으로 캐시 저장
        def cache_url():
            tag = entry.tag_input.text().strip()
            url = entry.url_input.text().strip()
            if tag and url:
                self.save_image_mapping(tag, url)
        
        entry.url_input.editingFinished.connect(cache_url)
        
        self.image_url_layout.addWidget(entry)
        
        # 레이아웃 업데이트 및 스크롤 영역 조정
        self.image_url_container.adjustSize()
        if hasattr(self, 'asset_status'):
            self.asset_status.setText("아카라이브 글쓰기에서 이미지 HTML 코드를 이미지 URL에 붙여넣습니다.")

    def upload_character_card(self):
        """캐릭터 카드 업로드 처리"""
        file_filter = "Character Card Files (*.json *.png *.charx);;All Files (*.*)"
        file_path, _ = QFileDialog.getOpenFileName(
            self, "캐릭터 카드 선택", "", file_filter)
        
        if file_path:
            try:
                print(f"\nProcessing character card: {file_path}")
                
                # 기존 에셋 정리
                self.card_handler.cleanup()
                
                if self.card_handler.read_character_card(file_path):
                    if self.card_handler.save_assets():
                        # 디버깅을 위한 정보 출력
                        print("\nAvailable image data:")
                        for key, value in self.card_handler.image_data.items():
                            print(f"- {key}")
                        
                        print("\nImage URI mappings:")
                        for name, uri in self.card_handler.image_uri_map.items():
                            print(f"- {name} -> {uri}")
                        
                        self.open_assets_btn.setEnabled(True)
                        self.update_asset_status(
                            f"캐릭터 카드 로드 완료. {len(self.card_handler.image_data)}개의 이미지가 추출되었습니다."
                        )
                    else:
                        self.update_asset_status("이미지 저장 실패. 로그를 확인하세요.")
                else:
                    self.update_asset_status("캐릭터 카드 로드 실패")
            except Exception as e:
                error_msg = f"오류 발생: {str(e)}"
                print(error_msg)
                self.update_asset_status(error_msg)

    def open_assets_folder(self):
        """에셋 폴더 열기"""
        try:
            if sys.platform == 'win32':
                os.startfile(self.card_handler.assets_folder)
            elif sys.platform == 'darwin':
                os.system(f'open "{self.card_handler.assets_folder}"')
            else:
                os.system(f'xdg-open "{self.card_handler.assets_folder}"')
        except Exception as e:
            self.update_asset_status(f"폴더 열기 실패: {str(e)}")

    def update_asset_status(self, message):
        """에셋 상태 메시지 업데이트"""
        self.asset_status.setText(message)

    def create_asset_name_img_tag_map(self):
        """이미지 태그 매핑 생성"""
        try:
            img_tags = self.asset_tags_input.toPlainText()
            if not img_tags:
                self.update_asset_status("이미지 태그를 입력해주세요.")
                return
            
            # 입력된 이미지 태그 확인
            print("\nInput image tags:")
            print(img_tags)
            
            img_tag_pattern = re.compile(r'<img[^>]+src="([^"]+)"[^>]*>')
            
            # 에셋 폴더의 파일 목록 가져오기
            asset_files = []
            assets_path = self.card_handler.assets_folder
            if os.path.exists(assets_path):
                print(f"\nChecking assets folder: {assets_path}")
                for filename in os.listdir(assets_path):
                    if filename.lower().endswith(('.png', '.jpg', '.webp')):
                        basename = os.path.splitext(filename)[0]
                        asset_files.append(basename)
                        print(f"Found asset: {basename}")
            
            self.asset_name_img_tag_map.clear()
            matches = list(img_tag_pattern.finditer(img_tags))
            print(f"\nFound {len(matches)} image tags and {len(asset_files)} asset files")
            
            # 매핑 생성
            for asset_name, match in zip(asset_files, matches):
                if match:
                    full_tag = match.group(0)
                    self.asset_name_img_tag_map[asset_name] = full_tag
                    print(f"Created mapping: {asset_name} -> {full_tag}")
            
            self.update_asset_status(
                f"이미지 태그 매핑 완료: {len(self.asset_name_img_tag_map)}개의 이미지가 매핑되었습니다."
            )
            
            # 최종 매핑 결과 출력
            print("\nFinal mapping results:")
            for name, tag in self.asset_name_img_tag_map.items():
                print(f"{name}: {tag}")
            
        except Exception as e:
            error_msg = f"이미지 태그 매핑 실패: {str(e)}"
            print(f"Error: {error_msg}")
            self.update_asset_status(error_msg)


    def create_mapping_buttons(self):
        """매핑 관리 버튼들이 있는 컨테이너 생성"""
        container = QWidget()
        layout = QHBoxLayout(container)
        layout.setContentsMargins(0, 0, 0, 0)
        
        # 매핑 저장 버튼
        save_btn = ModernButton("매핑 저장")
        save_btn.clicked.connect(lambda: self.mapping_manager.save_mapping_set_dialog())
        layout.addWidget(save_btn)
        
        # 매핑 불러오기 버튼
        load_btn = ModernButton("매핑 불러오기")
        load_btn.clicked.connect(lambda: self.mapping_manager.load_mapping_set_dialog())
        layout.addWidget(load_btn)
        
        # 매핑 삭제 버튼
        delete_btn = ModernButton("매핑 삭제")
        delete_btn.clicked.connect(lambda: self.mapping_manager.delete_mapping_set_dialog())
        layout.addWidget(delete_btn)

        # 매핑 초기화 버튼 추가
        reset_btn = ModernButton("매핑 초기화")
        reset_btn.clicked.connect(self.reset_mappings)
        layout.addWidget(reset_btn)

        return container


    def add_word_replace_entry(self):
        """단어 변경 입력 항목 추가"""
        entry = WordReplaceEntry(self.word_replace_container)
        self.word_replace_layout.addWidget(entry)

    def update_text_size_state(self):
        """텍스트 크기 설정 상태 업데이트"""
        is_text_size_enabled = self.use_text_size.isChecked()
        self.text_size.setEnabled(is_text_size_enabled)        

    def create_io_panel(self):
        """입출력 패널 생성"""
        # 최소 사이즈 힌트 오버라이드를 위한 커스텀 위젯
        class MinSizeWidget(QWidget):
            def minimumSizeHint(self):
                return QSize(0, 0)
            
        panel = MinSizeWidget()
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(0, 0, 0, 0)
        
        # 입력 영역
        input_group = SettingsGroup("텍스트 입력")
        
        self.input_text = QTextEdit()
        self.input_text.setPlaceholderText("여기에 텍스트를 입력하세요...")
        input_group.addWidget(self.input_text)
        layout.addWidget(input_group)
        
        # 출력 영역
        output_group = SettingsGroup("변환된 HTML")
        
        self.output_text = QTextEdit()
        self.output_text.setReadOnly(True)
        self.output_text.setFont(QFont("Consolas", STYLES['font_size_normal']))
        output_group.addWidget(self.output_text)
        layout.addWidget(output_group)
        
        # 버튼 영역
        button_container = QWidget()
        button_layout = QHBoxLayout(button_container)
        button_layout.setContentsMargins(0, 0, 0, 0)
        button_layout.setSpacing(STYLES['spacing_normal'])
        
        convert_btn = ModernButton("HTML 변환", primary=True)
        convert_btn.clicked.connect(self.convert_text)
        button_layout.addWidget(convert_btn)
        
        copy_btn = ModernButton("HTML 복사")
        copy_btn.clicked.connect(self.copy_to_clipboard)
        button_layout.addWidget(copy_btn)
        
        layout.addWidget(button_container)
        
        return panel

    def choose_color(self, target):
        """색상 선택 다이얼로그"""
        try:
            current_color = None
            color_button = None
            
            color_mappings = {
                "outer_box": (self.outer_box_color, "외부 박스"),
                "inner_box": (self.inner_box_color, "내부 박스"),
                "profile_border": (self.profile_border_color, "프로필 테두리"),
                "bot_name": (self.bot_name_color, "봇 이름"),
                "dialog": (self.dialog_color, "대화문"),
                "narration": (self.narration_color, "나레이션"),
                "inner_thoughts": (self.inner_thoughts_color, "속마음"),
                "divider_outer": (self.divider_outer_color, "구분선 외부"),
                "divider_inner": (self.divider_inner_color, "구분선 내부"),
                "divider_solid": (self.divider_solid_color, "구분선"),
                "box_border": (self.box_border_color, "로그박스 테두리"),
                "image_border": (self.image_border_color, "이미지 테두리")
            }
            
            if target in color_mappings:
                color_button, title = color_mappings[target]
                current_color = color_button.get_color()
            
            if not color_button:
                return
                
            dialog = QColorDialog(self)
            dialog.setWindowTitle(f"{title} 색상 선택")
            dialog.setCurrentColor(QColor(current_color))
            dialog.setOption(QColorDialog.ColorDialogOption.DontUseNativeDialog)
            
            if dialog.exec() == QColorDialog.DialogCode.Accepted:
                new_color = dialog.selectedColor()
                if new_color.isValid():
                    color_button.setColor(new_color.name())
                    
                    # 현재 선택된 템플릿 이름 가져오기
                    current_template = self.template_combo.currentText()
                    
                    # 템플릿이 "커스텀"이 아닌 경우에만 해당 템플릿 업데이트
                    if current_template != "커스텀":
                        # 템플릿 매니저의 templates 딕셔너리 업데이트
                        template_colors = self.template_manager.templates[current_template]["theme"]["colors"]
                        
                        # 색상 매핑 정의
                        color_to_template_key = {
                            "outer_box": "outer_box",
                            "inner_box": "inner_box",
                            "bot_name": "bot_name",
                            "dialog": "dialog",
                            "narration": "narration",
                            "inner_thoughts": "inner_thoughts",
                            "profile_border": "profile_border",
                            "divider_outer": "divider_outer",
                            "divider_inner": "divider_inner",
                            "box_border": "box_border",
                            "image_border": "image_border"
                        }
                        
                        # 선택된 색상을 템플릿에 업데이트
                        if target in color_to_template_key:
                            template_key = color_to_template_key[target]
                            template_colors[template_key] = new_color.name()
                    
                    self.update_preview()
                    
        except Exception as e:
            print(f"색상 선택 중 오류 발생: {str(e)}")
            QMessageBox.warning(
                self,
                "오류",
                f"색상 선택 중 오류가 발생했습니다: {str(e)}"
            )

    def choose_tag_color(self, tag_index):
        """태그 색상 선택"""
        color = QColorDialog.getColor()
        if color.isValid():
            self.tag_colors[tag_index].setColor(color.name())

    def toggle_divider_color_settings(self, style):
        """구분선 색상 설정 토글"""
        is_gradient = style == "그라데이션"
        self.gradient_settings.setVisible(is_gradient)
        self.solid_settings.setVisible(not is_gradient)

    def process_image_tags(self, content):
        """이미지 태그 처리 - 성능 개선 버전"""
        if not content:
            return content
            
        try:
            # 1. URL 매핑 한 번만 수집
            url_mappings = self._collect_url_mappings()
            
            # 2. 스타일 설정 한 번만 생성
            style_settings = self.get_image_style_settings()
            base_style = self._create_base_style(style_settings)
            
            # 3. 태그 변환 함수
            def replace_tag(match):
                try:
                    full_match = match.group(0)
                    
                    # 3.1 따옴표 정규화
                    full_match = full_match.replace('″', '"').replace('"', '"').replace('"', '"')
                    
                    # 3.2 태그 추출
                    tag = self._extract_tag_from_match(full_match)
                    
                    # 3.3 매핑된 URL이 있으면 HTML 생성
                    if tag and tag in url_mappings:
                        return self._create_image_html(
                            url_mappings[tag],
                            tag,
                            base_style
                        )
                        
                    return full_match
                    
                except Exception as e:
                    print(f"태그 처리 중 오류: {str(e)}")
                    return full_match

            # 4. 모든 패턴에 대해 처리
            result = content
            for pattern in self._get_image_patterns():
                result = re.sub(pattern, replace_tag, result)
            
            return result
            
        except Exception as e:
            print(f"이미지 처리 중 오류: {str(e)}")
            return content

    def _collect_url_mappings(self):
        """URL 매핑 수집"""
        mappings = {}
        for entry in self.image_url_container.findChildren(ImageUrlEntry):
            tag = entry.tag_input.text().strip()
            url = entry.url_input.text().strip()
            if tag and url:
                if 'style="width: 0px; height: 0px;"' in url:
                    url = url.replace('style="width: 0px; height: 0px;"', '')
                tag = self._extract_tag_identifier(tag)
                url = self._clean_url(url)
                mappings[tag] = url
        return mappings

    def _create_base_style(self, settings):
        """기본 이미지 스타일 생성"""
        style = f"""
            max-width:{settings['size']}%;
            margin:{settings['margin']}px 0;
            border-radius:12px;
        """
        
        if settings['use_border']:
            style += f"border:2px solid {settings['border_color']};"
        if settings['use_shadow']:
            style += "box-shadow:rgba(0,0,0,0.12) 0px 4px 16px;"
            
        return style

    def _extract_tag_from_match(self, full_match):
        """태그 추출"""
        tag = None
        
        if '{{' in full_match:
            if 'img::' in full_match or 'image::' in full_match:
                tag = full_match.split('::')[1].rstrip('}}').strip('"\'')
            elif 'img=' in full_match or 'image=' in full_match:
                tag = full_match.split('=')[1].strip('{}"\' ')
        elif '<img' in full_match or '<image' in full_match:
            if 'src=' in full_match:
                tag_match = re.search(r'src=[\'"″""](.*?)[\'"″""]', full_match)
                if tag_match:
                    tag = tag_match.group(1)
            else:
                tag_match = re.search(r'=([\'"″""](.*?)[\'"″""])', full_match)
                if tag_match:
                    tag = tag_match.group(2)
                    
        return tag

    def _create_image_html(self, url, tag, style):
        """이미지 HTML 생성"""
        return f'''
            <div style="margin-bottom:1rem; width:100%; text-align:center;">
                <img style="{style}" 
                    src="{url}" alt="{tag}" class="fr-fic fr-dii">
            </div>
        '''

    def _get_image_patterns(self):
        """이미지 태그 패턴 목록"""
        return [
            r'\{\{(img|image)::[\'""″""]*[^}]+[\'""″""]*\}\}',
            r'\{\{(img|image)=[\'""″""]*[^}]+[\'""″""]*\}\}',
            r'<(img|image)\s+src=[\'""″""]*[^\'""″""]+[\'""″""]*>',
            r'<(img|image)=[\'""″""]*[^>]+[\'""″""]*>'
        ]

    def _extract_tag_identifier(self, tag):
        """이미지 태그에서 식별자만 추출"""
        # img 태그에서 식별자 추출
        if '<img' in tag:
            match = re.search(r'src=[\'"](.*?)[\'"]', tag)
            if match:
                tag = match.group(1)
        
        # {{img::}} 형식에서 식별자 추출
        elif tag.startswith('{{img::'):
            tag = tag.split('::')[1].rstrip('}}').strip('"\'')
        
        # {{img=}} 형식에서 식별자 추출
        elif '{{img=' in tag:
            tag = tag.split('=')[1].strip('{}"\'')
        
        # .png 확장자 제거
        if tag.lower().endswith('.png'):
            tag = tag[:-4]
        
        return tag.strip()

    def _clean_url(self, url):
        """URL 정리"""
        # img 태그에서 URL 추출
        if '<img' in url:
            match = re.search(r'src=[\'"](.*?)[\'"]', url)
            if match:
                url = match.group(1)
        
        # 프로토콜 처리
        if url.startswith('//'):
            url = 'https:' + url
        
        # HTML 엔티티 디코딩
        url = re.sub(r'&amp;', '&', url)
        
        return url.strip()

    def process_image_url(self, url):
        """이미지 URL 처리"""
        if not url or not url.strip():
            print("No URL provided, using default image")
            return DEFAULT_PROFILE_IMAGE
        
        try:
            url = url.strip()
            print(f"Processing URL: {url}")
            
            # HTML 태그에서 URL 추출
            if '<img' in url:
                src_match = re.search(r'src=["\'](.*?)["\']', url)
                if src_match:
                    url = src_match.group(1)
                    print(f"Extracted URL from img tag: {url}")
            
            # 프로토콜 처리
            if url.startswith('//'):
                url = 'https:' + url
                print(f"Added https protocol: {url}")
            
            # 커뮤니티 이미지 URL 처리 (쿼리 파라미터 유지)
            if 'namu.la' in url or 'dcinside.com' in url:
                # 전체 URL을 캡처하도록 패턴 수정
                url_match = re.search(r'((?:https?:)?//[^\s<>"]+?\.(?:jpg|jpeg|png|gif)(?:\?[^"\s<>]*)?)', url)
                if url_match:
                    url = url_match.group(1)
                    if url.startswith('//'):
                        url = 'https:' + url
                    print(f"Processed community URL: {url}")
            
            # HTML 엔티티 디코딩
            url = re.sub(r'&amp;', '&', url)
            
            print(f"Final processed URL: {url}")
            return url

        except Exception as e:
            print(f"Error processing image URL: {str(e)}")
            return DEFAULT_PROFILE_IMAGE

    def update_profile_image(self):
        """프로필 이미지 업데이트"""
        try:
            # 프로필 표시 여부 확인
            if not self.show_profile.isChecked() or not self.show_profile_image.isChecked():
                return
            
            # URL 처리
            image_url = self.process_image_url(self.image_url.text())
            print(f"Using image URL: {image_url}")
            
            # 프레임 스타일에 따른 설정
            frame_style = self.frame_style.currentText()
            width = self.width_input.value()
            height = self.height_input.value()
            
            # 미리보기 업데이트
            self.update_preview()
            
        except Exception as e:
            print(f"Error updating profile image: {str(e)}")

    def init_profile_image_handlers(self):
        """프로필 이미지 관련 핸들러 초기화"""
        # URL 입력 변경 감지
        self.image_url.textChanged.connect(self.update_profile_image)
        
        # 프로필 관련 설정 변경 감지
        self.show_profile.stateChanged.connect(self.update_profile_image)
        self.show_profile_image.stateChanged.connect(self.update_profile_image)
        self.frame_style.currentTextChanged.connect(self.update_profile_image)
        self.width_input.valueChanged.connect(self.update_profile_image)
        self.height_input.valueChanged.connect(self.update_profile_image)

    def get_image_mappings(self):
        """현재 설정된 이미지 매핑 정보 반환"""
        mappings = {}
        for entry in self.image_url_container.findChildren(ImageUrlEntry):
            tag = entry.tag_input.text().strip()
            url = entry.url_input.text().strip()
            if tag and url:
                mappings[tag] = url
        return mappings

    def format_conversation(self, text):
        """대화문 포맷팅 - 대화문에만 선택적 줄바꿈 적용, 공백 보존"""
        indent = self.text_indent.value() if self.use_text_indent.isChecked() else 0
        dialog_color = self.dialog_color.get_color()
        inner_thoughts_color = self.inner_thoughts_color.get_color()
        narration_color = self.narration_color.get_color()
        
        dialog_bold = "font-weight:bold;" if self.dialog_bold.isChecked() else ""
        inner_thoughts_bold = "font-weight:bold;" if self.inner_thoughts_bold.isChecked() else ""
        text_size = f"font-size:{self.text_size.value()}px;" if self.use_text_size.isChecked() else ""
        
        if self.convert_ellipsis.isChecked():
            text = text.replace('...', '…')
        
        # 공백을 포함하는 패턴으로 수정
        dialog_pattern = r'(\s*[""″""]\s*.*?\s*[""″""]\s*)'  # 앞뒤 공백을 포함
        inner_thoughts_pattern = r'(\s*[\''']\s*.*?\s*[\''']\s*)'  # 앞뒤 공백을 포함
        
        lines = text.split('\n')
        formatted_lines = []
        
        for line in lines:
            if not line.strip():
                formatted_lines.append('<p><br></p>')
                continue
                
            if line.strip().startswith('<') and line.strip().endswith('>'):
                continue
            
            parts_to_process = []
            
            # 대화문 처리
            parts = re.split(dialog_pattern, line)
            for i, part in enumerate(parts):
                if re.match(dialog_pattern, part):
                    # 대화문일 경우
                    style = f"color:{dialog_color}; {dialog_bold} {text_size}"
                    # 원본 공백을 유지
                    if self.dialog_newline.isChecked():
                        content = f'<span style="{style}">{part}</span>'
                        parts_to_process.append(f'<div style="margin-top:1em; margin-bottom:1em;">{content}</div>')
                    else:
                        parts_to_process.append(f'<span style="{style}">{part}</span>')
                else:
                    # 나레이션과 속마음 처리
                    inner_parts = re.split(inner_thoughts_pattern, part)
                    for inner_part in inner_parts:
                        if re.match(inner_thoughts_pattern, inner_part):
                            # 속마음 처리 - 원본 공백 유지
                            style = f"color:{inner_thoughts_color}; {inner_thoughts_bold} {text_size}"
                            parts_to_process.append(f'<span style="{style}">{inner_part}</span>')
                        elif inner_part.strip():
                            # 나레이션 처리 - 앞뒤 공백 제거하지 않음
                            style = f"color:{narration_color}; {text_size}"
                            parts_to_process.append(f'<span style="{style}">{inner_part}</span>')
            
            # 들여쓰기 처리
            if self.use_text_indent.isChecked():
                formatted_lines.append(
                    f'<div style="margin-bottom:1rem; text-indent:{indent}px">{"".join(parts_to_process)}</div>'
                )
            else:
                formatted_lines.append(
                    f'<div style="margin-bottom:1rem;">{"".join(parts_to_process)}</div>'
                )
        
        return '\n'.join(formatted_lines)

    def create_template(self, content):
        """템플릿 HTML 생성"""
        try:
            template_name = self.template_combo.currentText()
            
            # 그라데이션 모던 템플릿 처리
            if template_name == "그라데이션 모던":
                # 기본 색상 설정
                colors = {
                    "outer_box": "#fafafa",
                    "profile_border": "#e3e3e3",
                    "gradient_start": "#D9D782",
                    "gradient_end": "#A9B9D9",
                    "divider_outer": "#e9e9e9",
                    "bot_name": "#ededed",
                    "narration": "#494949",
                    "tag_bg": "#494949",
                    "tag_text": "#d5d5d5"
                }
                
                # 봇 이름 섹션 생성
                bot_name_html = ""
                if self.show_bot_name.isChecked():
                    # 사용자가 입력한 봇 이름 사용, 없으면 기본값
                    bot_name = self.bot_name.text().strip() or "봇이름"
                    bot_name_html = f'''
                        <div style="background:linear-gradient(135deg,{colors['gradient_start']},{colors['gradient_end']});
                                    background-size:110%;
                                    background-position:center;
                                    border-radius:20px;
                                    padding:10px;
                                    line-height:10px;
                                    border:solid 10px {colors['divider_outer']};
                                    text-transform:uppercase;
                                    letter-spacing:1px;
                                    box-shadow:inset 0px 40px 0px rgba(30,30,30,.1);
                                    display:flex;
                                    width: fit-content;
                                    max-width: 200px;
                                    float: left;
                                    margin-left: 50px;
                                    margin-top: 5px;">
                            <span style="text-decoration:none;
                                    color:{colors['bot_name']};
                                    font-weight:bold;
                                    text-shadow:0px 0px 5px rgba(30,30,30,.1)">
                                {bot_name}
                            </span>
                        </div>'''

                # 태그 섹션 생성 - return 전으로 이동
                tags_html = ""
                if self.show_tags.isChecked():
                    tags = []
                    for i in range(self.tag_layout.count()):
                        widget = self.tag_layout.itemAt(i).widget()
                        if hasattr(widget, 'tag_input'):
                            tag_text = widget.tag_input.text() or f"태그 {i+1}"
                            tags.append(tag_text)
                    
                    if tags:
                        tags_html = f'''
                            <div style="margin-top: 15px;
                                        float: right;
                                        width: fit-content;
                                        background-color:{colors['tag_bg']};
                                        border-radius:5px 0px 0px 5px;
                                        padding:10px;
                                        line-height:10px;
                                        letter-spacing:2px;
                                        text-transform:uppercase;
                                        color:{colors['tag_text']};
                                        font-size:10px">
                                {' | '.join(tags)}
                            </div>'''

                # 프로필 이미지 섹션 생성
                profile_image_html = ""
                if self.show_profile.isChecked() and self.show_profile_image.isChecked():
                    image_url = self.process_image_url(self.image_url.text())
                    width = self.width_input.value()
                    height = self.height_input.value()
                    frame_style = self.frame_style.currentText()
                    
                    # 기본 이미지 스타일 설정
                    common_style = f"""
                        max-width: 100%;
                        display: block;
                        margin: 0 auto;
                        box-shadow: 0px 10px 30px rgba(0,0,0,0.1);
                        border: 3px solid {colors['profile_border']};
                    """
                    
                    # 프레임 스타일별 특수 스타일 적용
                    if frame_style == "배너":
                        image_style = f"""
                            {common_style}
                            width: 100%;
                            height: auto;
                            border-radius: 15px;
                            object-fit: cover;
                        """
                        container_style = "width: 100%; padding: 0 20px;"
                    elif frame_style == "동그라미":
                        image_style = f"""
                            {common_style}
                            width: {width}px;
                            height: {width}px;
                            border-radius: 50%;
                            object-fit: cover;
                        """
                        container_style = "width: auto;"
                    else:  # 직사각형
                        image_style = f"""
                            {common_style}
                            width: {width}px;
                            height: {height}px;
                            border-radius: 10px;
                            object-fit: cover;
                        """
                        container_style = "width: auto;"
                    
                    profile_image_html = f'''
                        <div style="text-align: center; 
                                    clear: both; 
                                    {container_style}
                                    padding-top: 40px;
                                    padding-bottom: 20px;">
                            <img style="{image_style}" 
                                src="{image_url}" 
                                alt="profile" 
                                class="fr-fic fr-dii">
                        </div>
                    '''

                # 최종 템플릿 반환 (한 번만)
                return f'''<p><br></p>
                    <div style="border:solid 2px {colors['profile_border']};
                                background-color:{colors['outer_box']};
                                border-radius:20px;
                                position:relative;
                                max-width:500px;
                                margin:0px auto;">
                        
                        <div style="height: 85px;margin:-1px -1px 0px -1px">
                            <div style="background:linear-gradient(-45deg,{colors['gradient_start']},{colors['gradient_end']});
                                        background-size:200%;
                                        height:70px;
                                        border-radius:19px 19px 0px 0px">
                                <div style="height:70px;width:100%;border-radius:19px 19px 0px 0px">
                                </div>
                            </div>
                        </div>
                        
                        {bot_name_html}
                        {profile_image_html}
                        {tags_html}
                        
                        
                        <div style="padding: 40px 60px 30px 60px;
                                    line-height:22px;
                                    letter-spacing:.35px;
                                    clear: both;">
                            {content}
                        </div>
                    </div>
                    <p><br></p>'''
        
            else:
                # 박스 색상
                box_outer_color = self.outer_box_color.get_color()
                box_inner_color = self.inner_box_color.get_color()
                shadow_value = self.shadow_intensity.value()
                
                # 테두리 설정
                border_style = ""
                if self.use_box_border.isChecked():
                    border_color = self.box_border_color.get_color()
                    border_thickness = self.box_border_thickness.value()
                    border_style = f"border: {border_thickness}px solid {border_color};"
            
                if self.show_inner_box.isChecked():
                    # 내부 박스가 있을 때
                    background_color = box_outer_color
                    inner_box_style = f"""
                        font-size:{STYLES['font_size_normal']}px;
                        background:{box_inner_color};
                        padding:{STYLES['spacing_large']}px;
                        border-radius:{STYLES['radius_normal']}px;"""
                else:
                    # 내부 박스가 없을 때
                    background_color = box_inner_color
                    inner_box_style = f"""
                        font-size:{STYLES['font_size_normal']}px;
                        padding:0;"""

                # 프로필 영역 HTML 생성
                profile_section_html = ''
                if self.show_profile.isChecked():
                    try:
                        profile_parts = []
                        
                        # 프로필 이미지
                        if self.show_profile_image.isChecked():
                            profile_border_color = self.profile_border_color.get_color()
                            width = self.width_input.value()
                            height = self.height_input.value()
                            image_url = self.process_image_url(self.image_url.text())
                            
                            # 기본 이미지 스타일 설정
                            common_style = f'''
                                max-width:100%;
                                {f'box-shadow:rgba(0,0,0,0.12) 0px 4px 16px;' if self.show_profile_shadow.isChecked() else ''}
                                {f'border:3px solid {profile_border_color};' if self.show_profile_border.isChecked() else ''}
                            '''
                            
                            if self.frame_style.currentText() == "배너":
                                profile_style = f"{common_style} border-radius:12px;"
                                container_style = "width:100%;"
                            elif self.frame_style.currentText() == "동그라미":
                                profile_style = f"{common_style} width:{width}px; height:{width}px; border-radius:50%; object-fit:cover;"
                                container_style = "width:auto;"
                            else:  # 직사각형
                                profile_style = f"{common_style} width:{width}px; height:{height}px; border-radius:8px; object-fit:cover;"
                                container_style = "width:auto;"
                            
                            profile_html = f'''
                            <div style="margin-bottom:1rem; text-align:center; {container_style}">
                                <img style="{profile_style}" 
                                    src="{image_url}" 
                                    alt="profile" 
                                    class="fr-fic fr-dii">
                            </div>
                            '''
                            profile_parts.append(profile_html)
                        
                        # 봇 이름
                        if self.show_bot_name.isChecked():
                            bot_name = self.bot_name.text() or "봇 이름"
                            bot_name_color = self.bot_name_color.get_color()
                            bot_name_html = f'''
                                <h3 style="color:{bot_name_color};font-weight:{STYLES['font_weight_bold']};">{bot_name}</h3>
                            '''
                            profile_parts.append(bot_name_html)

                        # 태그 처리
                        if self.show_tags.isChecked():
                            tags_html = []
                            for i in range(self.tag_layout.count()):
                                widget = self.tag_layout.itemAt(i).widget()
                                if isinstance(widget, TagEntry):
                                    style_dict = widget.get_style_dict()
                                    tag_text = style_dict['text'] or f"태그 {i+1}"
                                    css_styles = [
                                        f"display:inline-block",
                                        f"border-radius:{style_dict['border_radius']}px",
                                        f"font-size:{style_dict['font_size']}rem",
                                        f"padding:{style_dict['padding']['top']}rem {style_dict['padding']['right']}rem "
                                        f"{style_dict['padding']['bottom']}rem {style_dict['padding']['left']}rem",
                                        f"color:{style_dict['text_color']}"
                                    ]
                                    
                                    if style_dict['style'] == "투명 배경":
                                        css_styles.extend([
                                            f"background:transparent",
                                            f"border:1px solid {style_dict['color']}"
                                        ])
                                    elif style_dict['style'] == "그라데이션":
                                        base_color = QColor(style_dict['color'])
                                        light_color = base_color.lighter(120).name()
                                        dark_color = base_color.darker(120).name()
                                        css_styles.extend([
                                            f"background:linear-gradient(135deg, {light_color}, {dark_color})",
                                            "border:none"
                                        ])
                                    else:
                                        css_styles.extend([
                                            f"background:{style_dict['color']}",
                                            "border:none"
                                        ])
                                    
                                    tag_html = f'''
                                        <span style="{';'.join(css_styles)}">
                                            {tag_text}
                                        </span>
                                    '''
                                    tags_html.append(tag_html)
                            
                            if tags_html:
                                container_styles = [
                                    "text-align:center",
                                    "margin:0 auto",
                                    "max-width:fit-content"
                                ]
                                
                                tags_container = f'''
                                    <div style="{';'.join(container_styles)}">
                                        {''.join(tags_html)}
                                    </div>
                                '''
                                profile_parts.append(tags_container)
                        
                        # 구분선
                        if self.show_divider.isChecked():
                            thickness = self.divider_thickness.value()
                            if self.divider_style.currentText() == "그라데이션":
                                divider_outer_color = self.divider_outer_color.get_color()
                                divider_inner_color = self.divider_inner_color.get_color()
                                divider_style = f"background:linear-gradient(to right,{divider_outer_color} 0%,{divider_inner_color} 50%,{divider_outer_color} 100%);"
                            else:
                                solid_color = self.divider_solid_color.get_color()
                                divider_style = f"background:{solid_color};"

                            divider_html = f'''
                                <div style="height:{thickness}px;{divider_style}margin:1rem 0;border-radius:{thickness/2}px;">
                                    <br>
                                </div>
                            '''
                            profile_parts.append(divider_html)
                        
                        # 전체 프로필 섹션 조합
                        if profile_parts:
                            profile_section_html = f'''
                                <div style="display:flex;flex-direction:column;text-align:center;margin-bottom:1.25rem;">
                                    {''.join(profile_parts)}
                                </div>
                            '''
                    
                    except Exception as e:
                        print(f"Error in profile creation: {str(e)}")
                
                # 기존 템플릿 반환
                return f'''<p><br></p>
                    <p><br></p>
                    <div style="font-family:{STYLES['font_family']};
                                color:{STYLES['text']};
                                line-height:1.8;
                                width:100%;
                                max-width:600px;
                                margin:1rem auto;
                                background:{background_color};
                                border-radius:{STYLES['radius_large']}px;
                                box-shadow:0px {shadow_value}px {shadow_value * 2}px rgba(0,0,0,0.2);
                                {border_style}">
                        <div style="padding:{STYLES['spacing_large']}px;">
                            <div style="{inner_box_style}">
                                {profile_section_html}
                                {content}
                            </div>
                        </div>
                    </div>
                    <p><br></p>
                    <p><br></p>'''
                    
        except Exception as e:
            print(f"Error in template creation: {str(e)}")
            return f"<div>{content}</div>"

    def convert_text(self):
        """텍스트 변환"""
        try:
            input_text = self.input_text.toPlainText()
            if not input_text.strip():
                self.output_text.setPlainText("")
                return

            # 이미지 태그 처리를 먼저 수행
            content = self.process_image_tags(input_text)
            
            # 단어 변경
            for entry in self.word_replace_container.findChildren(WordReplaceEntry):
                from_word = entry.from_word.text()
                to_word = entry.to_word.text()
                if from_word and to_word:
                    content = content.replace(from_word, to_word)

            # 에스터리스크 제거
            if self.remove_asterisk.isChecked():
                content = re.sub(r'\*+', '', content)

            # 각 문단을 처리
            paragraphs = []
            for paragraph in content.split('\n\n'):
                if paragraph.strip():
                    # 이미 처리된 HTML이면 그대로 사용, 아니면 대화문 포맷팅
                    if paragraph.strip().startswith('<div'):
                        paragraphs.append(paragraph)
                    else:
                        formatted_text = self.format_conversation(paragraph)
                        paragraphs.append(f'<div style="margin-bottom:1.5rem;">{formatted_text}</div>')
            
            # 최종 HTML 생성
            content = '\n'.join(paragraphs)
            template = self.create_template(content)
            
            self.output_text.setPlainText(template)
            
        except Exception as e:
            self.handle_error(
                "데이터 처리 중 오류가 발생했습니다.",
                ErrorSeverity.MEDIUM,
                e
            )

    def copy_to_clipboard(self):
        """HTML 복사"""
        clipboard = QApplication.clipboard()
        clipboard.setText(self.output_text.toPlainText())

    def create_bulk_url_input_dialog(self):
        """대량 URL 입력 다이얼로그"""
        dialog = QDialog(self)
        dialog.setWindowTitle("이미지 URL 일괄 입력")
        dialog.setModal(True)  # 모달 대화상자로 설정
        dialog.resize(800, 600)  # 적절한 초기 크기 설정
        
        layout = QVBoxLayout(dialog)
        
        # 스크롤 영역 추가
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setStyleSheet(self.get_scrollbar_style())
        
        scroll_content = QWidget()
        scroll_layout = QVBoxLayout(scroll_content)
        
        # 설명 레이블
        instruction = QLabel(
            "웹사이트에서 추출한 이미지 HTML 코드를 순서대로 붙여넣으세요.\n"
            "현재 추출된 이미지 태그:"
        )
        scroll_layout.addWidget(instruction)
        
        # 태그 목록을 스크롤 가능한 텍스트 영역으로 표시
        tag_list = QTextEdit()
        tag_list.setReadOnly(True)
        tag_list.setMaximumHeight(150)  # 태그 목록의 최대 높이 제한
        sorted_tags = sorted(self.card_handler.image_uri_map.keys(), key=str.lower)  # 대소문자 구분 없이 정렬
        tag_list.setText("\n".join(sorted_tags))
        scroll_layout.addWidget(tag_list)
        
        # URL 입력 영역
        url_input = QTextEdit()
        url_input.setPlaceholderText("<img src='...'>\n<img src='...'>\n...")
        url_input.setMinimumHeight(200)  # 최소 높이 설정
        scroll_layout.addWidget(url_input)
        
        # 버튼들을 담을 컨테이너
        button_container = QWidget()
        button_layout = QHBoxLayout(button_container)
        
        # 매핑 생성 버튼
        ok_button = ModernButton("매핑 생성", primary=True)
        ok_button.clicked.connect(lambda: self.process_bulk_mapping_and_close(
            url_input.toPlainText(),
            sorted(list(self.card_handler.image_uri_map.keys()), key=str.lower),
            dialog
        ))
        button_layout.addWidget(ok_button)
        
        # 가로 세로 0 버튼 추가
        def apply_zero_size():
            current_text = url_input.toPlainText()
            modified_text = re.sub(
                r'(<img[^>]*?)(?:\s+style="[^"]*")?([^>]*?>)',
                r'\1 style="width: 0px; height: 0px;"\2',
                current_text
            )
            url_input.setPlainText(modified_text)
        
        zero_size_button = ModernButton("가로 세로 0")
        zero_size_button.clicked.connect(apply_zero_size)
        button_layout.addWidget(zero_size_button)
        
        # 취소 버튼
        cancel_button = ModernButton("취소")
        cancel_button.clicked.connect(dialog.reject)
        button_layout.addWidget(cancel_button)
        
        scroll_layout.addWidget(button_container)
        scroll.setWidget(scroll_content)
        layout.addWidget(scroll)
        
        return dialog

    def process_bulk_mapping_and_close(self, urls_text, image_tags, dialog):
        """URL 매핑 처리 후 다이얼로그 닫기"""
        try:
            success = self.process_bulk_mapping(urls_text, image_tags)
            if success:
                dialog.accept()  # 성공 시에만 다이얼로그 닫기
        except Exception as e:
            QMessageBox.warning(
                self,
                "처리 오류",
                f"매핑 처리 중 오류가 발생했습니다: {str(e)}"
            )

    def process_bulk_mapping(self, urls_text, image_tags):
        """URL과 이미지 태그 매핑 처리"""
        try:
            # URL들을 줄별로 분리하고 HTML에서 URL 추출
            raw_urls = [url.strip() for url in urls_text.split('\n') if url.strip()]
            urls = []
            
            # HTML에서 URL만 추출
            for raw_url in raw_urls:
                if '<img' in raw_url:  # HTML 태그인 경우
                    extracted_url = self.extract_url_from_html(raw_url)
                    if extracted_url:
                        urls.append(extracted_url)
                elif raw_url.startswith('http') or raw_url.startswith('//'): # 직접 URL인 경우
                    urls.append(raw_url)
            
            # 유효한 URL만 필터링
            urls = [url for url in urls if url]
            
            if len(urls) != len(image_tags):
                QMessageBox.warning(
                    self,
                    "매핑 오류",
                    f"URL 수({len(urls)})와 이미지 태그 수({len(image_tags)})가 일치하지 않습니다."
                )
                return False
                
            # 기존 매핑 삭제
            for i in reversed(range(self.image_url_layout.count())):
                self.image_url_layout.itemAt(i).widget().deleteLater()
                
            # 새 매핑 생성
            for tag, url in zip(image_tags, urls):
                entry = ImageUrlEntry(self.image_url_container)
                entry.tag_input.setText(tag)
                
                # URL이 HTML 태그인 경우 추출
                if '<img' in url:
                    url = self.extract_url_from_html(url) or url
                
                entry.url_input.setText(url)
                self.image_url_layout.addWidget(entry)
                
                # 캐시에도 저장
                self.save_image_mapping(tag, url)
                
            QMessageBox.information(
                self,
                "매핑 완료",
                f"{len(image_tags)}개의 매핑이 성공적으로 생성되었습니다."
            )
            return True
                
        except Exception as e:
            QMessageBox.warning(
                self,
                "처리 오류",
                f"매핑 처리 중 오류가 발생했습니다: {str(e)}"
            )
            return False

    def save_all_mappings(self):
        """모든 매핑 저장"""
        mappings = {}
        for i in range(self.image_url_layout.count()):
            entry = self.image_url_layout.itemAt(i).widget()
            tag = entry.tag_input.text().strip()
            url = entry.url_input.text().strip()
            if tag and url:
                mappings[tag] = url
        
        # 파일로 저장
        file_path = QFileDialog.getSaveFileName(
            self,
            "매핑 저장",
            "",
            "JSON 파일 (*.json)"
        )[0]
        
        if file_path:
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(mappings, f, ensure_ascii=False, indent=2)

    def add_mapping_buttons(self):
        """매핑 관리 버튼 추가"""
        button_layout = QHBoxLayout()
        
        bulk_input_btn = ModernButton("일괄 입력")
        bulk_input_btn.clicked.connect(lambda: self.create_bulk_url_input_dialog().exec())
        
        save_btn = ModernButton("매핑 저장")
        save_btn.clicked.connect(self.save_all_mappings)
        
        load_btn = ModernButton("매핑 불러오기")
        load_btn.clicked.connect(self.load_mappings)
        
        button_layout.addWidget(bulk_input_btn)
        button_layout.addWidget(save_btn)
        button_layout.addWidget(load_btn)
        
        return button_layout

    def reset_mappings(self):
        """현재 매핑 초기화"""
        reply = QMessageBox.question(
            self,
            "매핑 초기화",
            "현재 설정된 모든 매핑을 초기화하시겠습니까?",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.Yes:
            try:
                # 기존 매핑 제거
                for i in reversed(range(self.image_url_layout.count())):
                    widget = self.image_url_layout.itemAt(i).widget()
                    if widget:
                        widget.deleteLater()
                
                # 기본 항목 3개 추가
                for _ in range(3):
                    self.add_image_url_entry()
                
                QMessageBox.information(
                    self,
                    "초기화 완료",
                    "매핑이 초기화되었습니다."
                )
            except Exception as e:
                QMessageBox.warning(
                    self,
                    "오류",
                    f"매핑 초기화 중 오류가 발생했습니다: {str(e)}"
                )

    def create_preset_button(self):
        """프리셋 관리 버튼 생성"""
        preset_btn = ModernButton("프리셋 관리")
        preset_btn.setFixedWidth(120)
        preset_btn.clicked.connect(self.show_preset_menu)
        return preset_btn

    def show_preset_menu(self):
        """프리셋 관리 메뉴 표시"""
        menu = QMenu(self)
        
        # 현재 설정 저장
        save_action = menu.addAction("현재 설정을 프리셋으로 저장")
        save_action.triggered.connect(self.preset_manager.save_current_settings)
        
        if self.preset_manager.presets:
            # 저장된 프리셋이 있을 경우 구분선 추가
            menu.addSeparator()
            
            # 저장된 프리셋 메뉴
            load_menu = menu.addMenu("프리셋 불러오기")
            delete_menu = menu.addMenu("프리셋 삭제")
            
            for name in sorted(self.preset_manager.presets.keys()):
                # 불러오기 메뉴
                load_action = load_menu.addAction(name)
                load_action.triggered.connect(lambda checked, n=name: self.preset_manager.load_preset(n))
                
                # 삭제 메뉴
                delete_action = delete_menu.addAction(name)
                delete_action.triggered.connect(lambda checked, n=name: self.preset_manager.delete_preset(n))
        
        # 버튼 위치에 메뉴 표시
        menu.exec(self.sender().mapToGlobal(self.sender().rect().bottomLeft()))


    def update_profile_style_states(self):
        """프로필 이미지 스타일 설정 상태 업데이트"""
        # 테두리 설정 상태
        is_border_enabled = self.show_profile_border.isChecked()
        self.profile_border_color.setEnabled(is_border_enabled)



    def cleanup_large_objects(self):
        """대용량 객체 정리"""
        try:
            # 1. 텍스트 에디터 버퍼 정리
            if hasattr(self, 'input_text'):
                if len(self.input_text.toPlainText()) > 1000000:  # 1MB 이상
                    self.input_text.clear()
                    
            if hasattr(self, 'output_text'):
                if len(self.output_text.toPlainText()) > 1000000:
                    self.output_text.clear()
            
            # 2. 이미지 캐시 정리
            if hasattr(self, 'image_cache_manager'):
                stats = self.image_cache_manager.get_stats()
                if stats['total_size_mb'] > 100:  # 100MB 초과
                    self.image_cache_manager.clear()
            
            # 3. 임시 파일 정리
            if hasattr(self, 'card_handler'):
                self.card_handler.cleanup()
                
        except Exception as e:
            self.error_handler.handle_error(
                "대용량 객체 정리 중 오류가 발생했습니다.",
                ErrorSeverity.LOW,
                e
            )


    def closeEvent(self, event):
        """프로그램 종료 시 처리"""
        try:
            # 1단계: 기본 설정 저장
            cleanup_success = self._save_all_settings()
            if not cleanup_success:
                self._show_cleanup_warning(event)
                return

            # 2단계: 리소스 정리
            if not self._cleanup_resources():
                self._show_cleanup_warning(event)
                return

            # 3단계: 임시 파일 정리
            if not self._cleanup_temp_files():
                self._show_cleanup_warning(event)
                return

            event.accept()
        except Exception as e:
            self.error_handler.handle_error(
                f"프로그램 종료 중 오류가 발생했습니다: {str(e)}",
                ErrorSeverity.HIGH
            )
            event.accept()

    def _save_all_settings(self):
        """모든 설정 저장"""
        try:
            # 창 위치와 크기 저장
            self.settings.setValue('window_geometry', self.saveGeometry())
            
            # Splitter 상태 저장
            if self.splitter:
                self.settings.setValue('splitter_state', self.splitter.saveState())
            
            # 텍스트 설정 저장
            if hasattr(self, 'text_settings_manager'):
                self.text_settings_manager.save_settings()
            
            # 프리셋과 태그 설정 저장
            self.preset_manager.save_presets()
            self.save_tag_presets_to_file()
            
            return True
        except Exception as e:
            print(f"설정 저장 중 오류: {str(e)}")
            return False

    def _cleanup_resources(self):
        """리소스 정리"""
        try:
            # 타이머 정리
            if hasattr(self, 'preview_timer') and self.preview_timer:
                self.preview_timer.stop()
                self.preview_timer.deleteLater()
            
            # 메모리 모니터링 타이머 정리
            if hasattr(self, 'memory_monitor_timer') and self.memory_monitor_timer:
                self.memory_monitor_timer.stop()
                self.memory_monitor_timer.deleteLater()
            
            # resource manager를 통한 정리
            if hasattr(self, 'resource_manager'):
                cleanup_success = self.resource_manager.cleanup()
                if not cleanup_success:
                    return False
            
            # 위젯 정리
            for widget in self.findChildren(QWidget):
                widget.deleteLater()
                
            return True
        except Exception as e:
            print(f"리소스 정리 중 오류: {str(e)}")
            return False

    def _cleanup_temp_files(self):
        """임시 파일 정리"""
        try:
            if hasattr(self, 'card_handler'):
                self.card_handler.cleanup()
            return True
        except Exception as e:
            print(f"임시 파일 정리 중 오류: {str(e)}")
            return False

    def _show_cleanup_warning(self, event):
        """정리 실패 시 경고 표시"""
        reply = QMessageBox.question(
            self,
            '경고',
            '일부 리소스 정리 중 문제가 발생했습니다. 프로그램을 종료하시겠습니까?',
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No
        )
        
        if reply == QMessageBox.StandardButton.Yes:
            event.accept()
        else:
            event.ignore()

    def export_presets_dialog(self):
        """프리셋 내보내기 다이얼로그"""
        filepath, _ = QFileDialog.getSaveFileName(
            self, "프리셋 내보내기", "", 
            "JSON 파일 (*.json);;모든 파일 (*.*)")
        
        if filepath:
            if not filepath.endswith('.json'):
                filepath += '.json'
            self.preset_manager.export_presets(filepath)

    def import_presets_dialog(self):
        """프리셋 가져오기 다이얼로그"""
        filepath, _ = QFileDialog.getOpenFileName(
            self, "프리셋 가져오기", "", 
            "JSON 파일 (*.json);;모든 파일 (*.*)")
        
        if filepath:
            self.preset_manager.import_presets(filepath)

    def handle_error(self, error_msg, severity=ErrorSeverity.MEDIUM, exception=None):
        """에러 처리를 ErrorHandler로 위임"""
        self.error_handler.handle_error(error_msg, severity, exception)

    def log_error(self, error_msg):
        """이전 버전과의 호환성을 위한 메서드"""
        severity = ErrorSeverity.HIGH if "심각" in error_msg else ErrorSeverity.MEDIUM
        self.error_handler.handle_error(error_msg, severity)


def main():
    app = QApplication(sys.argv)
    app.setApplicationName("LogGenerator Pro")
    app.setWindowIcon(QIcon('log_icon.ico'))  # 앱 아이콘 설정
    
    icon_path = resource_path('log_icon.ico')
    app.setWindowIcon(QIcon(icon_path))

    # 애플리케이션 전역 폰트 설정
    font = QFont(STYLES['font_family'], STYLES['font_size_normal'])
    font.setWeight(STYLES['font_weight_normal'])
    app.setFont(font)
    
    # 다크 모드 감지 및 스타일 조정
    if app.styleHints().colorScheme() == Qt.ColorScheme.Dark:
        STYLES.update({
            'background': '#1C1C1E',
            'surface': '#2C2C2E',
            'text': '#FFFFFF',
            'text_secondary': '#98989D',
            'border': '#3A3A3C',
        })
    
    converter = ModernLogGenerator()
    converter.show()
    sys.exit(app.exec())

if __name__ == '__main__':
    main()       