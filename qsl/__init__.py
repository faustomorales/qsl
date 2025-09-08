# using importlib.metadata
import importlib.metadata

__version__ = importlib.metadata.version(__name__)

from .widgets import MediaLabeler
from .common import counts2bitmap, bitmap2counts
