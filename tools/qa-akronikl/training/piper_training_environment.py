"""Task-local Windows native data path. Never edits the installed Kitsune."""
import hashlib,tempfile,shutil
from pathlib import Path
def prepare_native_data():
 from piper.phonemize_espeak import ESPEAK_DATA_DIR,EspeakPhonemizer
 token=hashlib.sha256(str(Path.cwd()).encode('utf-8')).hexdigest()[:12]
 target=Path(tempfile.gettempdir())/('AkroniklPiper-1.8-'+token)/'espeak-ng-data'
 if not (target/'phontab').is_file():shutil.copytree(ESPEAK_DATA_DIR,target,dirs_exist_ok=True)
 # Native eSpeak on Windows cannot reliably open this project's Unicode path.
 # Supply an explicit ASCII temporary data path to all task-local instances.
 EspeakPhonemizer.__init__.__defaults__=(target,)
 return target
