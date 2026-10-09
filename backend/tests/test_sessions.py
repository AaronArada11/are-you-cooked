"""Also runnable without PostgreSQL: PYTHONPATH=backend python backend/tests/test_sessions.py."""
import unittest
from concurrent.futures import ThreadPoolExecutor
from uuid import uuid4

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routers import sessions
from app.routers.exercises import get_exercise, router as exercises_router
from app.schemas.session import Code, Control
from app.sessions import MemorySessionStore, SessionConflict


class SessionTests(unittest.TestCase):
    def setUp(self):
        self.store = MemorySessionStore()
        sessions.store = self.store
        app = FastAPI()
        app.include_router(sessions.router)
        app.include_router(exercises_router)
        self.client = TestClient(app)
        self.record = self.client.post('/sessions', json={}).json()
        self.url = f"/sessions/{self.record['id']}"

    def action(self, kind, **data):
        return self.client.post(self.url + '/events', json={'kind': kind, **data})

    def test_complete_record(self):
        self.assertEqual(self.record['state'], 'introduction')
        self.assertEqual(self.record['exercise_version'], 1)
        self.assertEqual(self.action('message', text='I will group sorted letters.').status_code, 200)
        for kind, data, state in [
            ('start', {}, 'solving'),
            ('snapshot', {'code': ''}, 'solving'),
            ('hint', {'text': 'How should I start?'}, 'solving'),
            ('test_run', {'code': 'raise Exception()'}, 'solving'),
            ('submit', {'code': '# incomplete attempt'}, 'submitted'),
            ('feedback', {}, 'feedback'),
            ('end', {}, 'ended'),
        ]:
            response = self.action(kind, **data)
            self.assertEqual(response.status_code, 200, response.text)
            self.assertEqual(response.json()['state'], state)
        record = self.client.get(self.url).json()
        events = record['events']
        ids = {event['id'] for event in events}
        self.assertEqual(len(ids), len(events))
        self.assertTrue(all(event['timestamp'].endswith('Z') for event in events))
        self.assertEqual([e['timestamp'] for e in events], sorted(e['timestamp'] for e in events))
        by_id = {e['id']: e for e in events}
        for event in events:
            if event['kind'] in ('test_run', 'submission'):
                self.assertEqual(by_id[event['data']['snapshot_id']]['kind'], 'code_snapshot')
            if event['kind'] in ('test_run', 'feedback'):
                self.assertEqual(event['data']['status'], 'unavailable')
        hint = next(e for e in events if e['kind'] == 'hint')
        self.assertEqual(hint['data']['status'], 'requested')
        self.assertEqual(record['persistence'], 'in_memory')

    def test_every_state_action_pair(self):
        actions = {
            'start': {}, 'message': {'text': 'hello'}, 'snapshot': {'code': ''},
            'hint': {'text': 'help'}, 'test_run': {'code': ''},
            'submit': {'code': ''}, 'feedback': {}, 'end': {},
        }
        allowed = {
            'introduction': {'start', 'message'},
            'solving': {'message', 'snapshot', 'hint', 'test_run', 'submit'},
            'submitted': {'feedback'}, 'feedback': {'end'}, 'ended': set(),
        }
        progression = [('start', {}), ('submit', {'code': ''}), ('feedback', {}), ('end', {})]
        for index, (state, permitted) in enumerate(allowed.items()):
            for kind, data in actions.items():
                with self.subTest(state=state, kind=kind):
                    record = self.client.post('/sessions', json={}).json()
                    self.url = f"/sessions/{record['id']}"
                    for step, payload in progression[:index]:
                        self.assertEqual(self.action(step, **payload).status_code, 200)
                    before = self.client.get(self.url).json()
                    response = self.action(kind, **data)
                    self.assertEqual(response.status_code, 200 if kind in permitted else 409)
                    if kind not in permitted:
                        self.assertEqual(self.client.get(self.url).json(), before)

    def test_validation_and_missing_records(self):
        for payload in [{'kind': 'submit'}, {'kind': 'message', 'text': ''},
                        {'kind': 'message', 'text': 'x', 'role': 'interviewer'},
                        {'kind': 'test_run', 'code': '', 'status': 'passed'},
                        {'kind': 'snapshot', 'code': 'x' * 100001}, {'kind': 'unknown'}]:
            self.assertEqual(self.client.post(self.url + '/events', json=payload).status_code, 422)
        self.assertEqual(self.client.get('/sessions/not-a-uuid').status_code, 422)
        self.assertEqual(self.client.get(f'/sessions/{uuid4()}').status_code, 404)
        self.assertEqual(self.client.post(f'/sessions/{uuid4()}/events', json={'kind': 'start'}).status_code, 404)
        self.assertEqual(self.client.post('/sessions', json={'exercise_id': 'missing'}).status_code, 404)

    def test_public_exercise(self):
        response = self.client.get('/exercises/anagram-groups')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['examples'][0]['words'][0], 'listen')
        self.assertNotIn('hidden_tests', response.text)
        self.assertNotIn('reference_solution', response.text)

    def test_storage_boundary_and_concurrent_submission(self):
        record = self.store.create(get_exercise('anagram-groups'))
        record.events.clear()
        self.assertEqual(len(self.store.get(record.id).events), 1)
        copy = self.store.get(record.id)
        copy.events[0].data.clear()
        self.assertTrue(self.store.get(record.id).events[0].data)
        with self.assertRaises(KeyError):
            MemorySessionStore().get(record.id)
        self.store.apply(record.id, Control(kind='start'))

        def submit(_):
            try:
                self.store.apply(record.id, Code(kind='submit', code=''))
                return 'accepted'
            except SessionConflict:
                return 'rejected'

        with ThreadPoolExecutor(max_workers=2) as pool:
            self.assertCountEqual(list(pool.map(submit, range(2))), ['accepted', 'rejected'])
        self.assertEqual(sum(e.kind == 'submission' for e in self.store.get(record.id).events), 1)


if __name__ == '__main__':
    unittest.main()
