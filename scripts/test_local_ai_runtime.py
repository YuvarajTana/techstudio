import tempfile
from pathlib import Path
import unittest
from unittest.mock import patch
import local_ai_runtime as runtime

class LocalRuntimeTests(unittest.TestCase):
    def test_remote_and_credential_urls_rejected(self):
        for url in ('https://ollama.com','http://127.0.0.1.evil.test','http://user:pass@localhost:11434','http://localhost:11434/redirect','file:///tmp/model'):
            with self.subTest(url=url), patch.dict('os.environ', {'OLLAMA_BASE_URL':url}), self.assertRaises(runtime.RuntimeUnavailable):
                runtime.ollama_url()

    def test_cloud_tag_rejected_before_any_request(self):
        with patch.dict('os.environ', {'LOCAL_AI_TEXT_MODEL':'qwen3:cloud'}), patch.object(runtime,'ollama') as call:
            with self.assertRaises(runtime.RuntimeUnavailable): runtime.local_model('text')
            call.assert_not_called()

    def test_disguised_cloud_metadata_rejected_before_prompt(self):
        for remote in ({'remote_host':'ollama.com'}, {'remote_model':'qwen3:cloud'}, {'details':{'remote_host':'ollama.com'}}):
            with self.subTest(remote=remote), patch.object(runtime,'ollama',side_effect=[{'models':[{'name':'qwen3:latest','digest':'a'*64}]},remote]) as call:
                with self.assertRaises(runtime.RuntimeUnavailable): runtime.local_model('text')
                self.assertFalse(any(args.args[0]=='/api/chat' for args in call.call_args_list))

    def test_changed_digest_or_version_requires_repreparation(self):
        responses=[{'models':[{'name':'qwen3:latest','digest':'b'*64}]},{},{'version':'1'}]
        with patch.object(runtime,'ollama',side_effect=responses):
            with self.assertRaises(runtime.RuntimeUnavailable): runtime.local_model('text',{'model':'qwen3:latest','digest':'a'*64,'runtime_version':'1'})

    def test_missing_models_never_download_or_start_processes(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(runtime.subprocess,'run') as spawn, patch.object(runtime,'ollama') as call:
            with self.assertRaises(runtime.RuntimeUnavailable): runtime.run_task('image',{'prompt':'A tree'},Path(directory)/'out',Path(directory))
            spawn.assert_not_called();call.assert_not_called()

    def test_file_manifest_detects_same_size_corruption(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);model=root/'model.bin';model.write_bytes(b'first')
            entry={'model_path':str(root),'files':runtime.file_records(root)}
            runtime.verify_files(entry,full=True)
            model.write_bytes(b'other')
            with self.assertRaises(runtime.RuntimeUnavailable):runtime.verify_files(entry,full=True)

    def test_low_disk_accounts_for_download_staging_and_working_space(self):
        usage=type('Usage',(),{'free':25*runtime.GIB})()
        with patch.object(runtime.shutil,'disk_usage',return_value=usage):
            plan=runtime.disk_plan(Path('/tmp'),'image')
            self.assertFalse(plan['sufficient'])
            self.assertEqual(plan['required_free_bytes'],plan['download_bytes']+plan['staging_bytes']+plan['dependencies_bytes']+plan['working_reserve_bytes'])

if __name__=='__main__':unittest.main()
