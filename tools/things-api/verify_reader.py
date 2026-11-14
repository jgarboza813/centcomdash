"""Verify pinned library semantics using synthetic data, never the user's database."""
import os, time, sqlite3, tempfile, plistlib, re, json
from datetime import date
from pathlib import Path
os.environ['TZ']='America/New_York'; time.tzset()
import things
from reader_policy import today_with_completed, enrich_categories
from things.database import make_tasks_sql_query
with tempfile.TemporaryDirectory(prefix='centcom-things-compat-') as directory:
    path=Path(directory)/'fixture.sqlite';db=sqlite3.connect(path)
    sql=make_tasks_sql_query()
    aliases={'TASK':'TMTask','PROJECT':'TMTask','HEADING':'TMTask','PROJECT_OF_HEADING':'TMTask','AREA':'TMArea','TAGS':'TMTaskTag','TAG':'TMTag','CHECKLIST_ITEM':'TMChecklistItem'}
    columns={table:set() for table in aliases.values()}
    for alias,col in re.findall(r"\b([A-Z_]+)\.['\"]?([A-Za-z_][A-Za-z_0-9]*)",sql):
        if alias in aliases:columns[aliases[alias]].add(col)
    columns['TMTask'].update({'startBucket', 'rt1_recurrenceRule', 'deadlineSuppressionDate'})
    for table,cols in columns.items():db.execute('CREATE TABLE '+table+' ('+','.join('"'+c+'"' for c in sorted(cols))+')')
    db.execute('CREATE TABLE Meta(key,value)');db.execute('INSERT INTO Meta VALUES (?,?)',('databaseVersion',plistlib.dumps(22).decode()))
    for uuid,status,trashed in [('done',3,0),('canceled',2,0),('trash',0,1),('open',0,0)]:
        db.execute('INSERT INTO TMTask(uuid,title,type,status,trashed,start) VALUES (?,?,?,?,?,?)',(uuid,'Synthetic '+uuid,0,status,trashed,1))
    day = date.today()
    encoded_day = (day.year << 16) | (day.month << 12) | (day.day << 7)
    for uuid, bucket in [('daytime', 0), ('this-evening', 1)]:
        db.execute('INSERT INTO TMTask(uuid,title,type,status,trashed,start,startDate,startBucket,todayIndex) VALUES (?,?,?,?,?,?,?,?,?)', (uuid, 'Synthetic '+uuid, 0, 0, 0, 1, encoded_day, bucket, bucket))
    for uuid, offset in [('completed-today', 0), ('completed-yesterday', 86400)]:
        db.execute('INSERT INTO TMTask(uuid,title,type,status,trashed,start,startDate,startBucket,todayIndex,stopDate) VALUES (?,?,?,?,?,?,?,?,?,?)', (uuid, 'Synthetic '+uuid, 0, 3, 0, 1, encoded_day, 0, 2, time.time()-offset))
    for uuid, kind, title, project, heading, status, trashed in [
        ('project-a',1,'Travel',None,None,0,0),
        ('project-b',1,'Travel',None,None,0,0),
        ('blank-project',1,'   ',None,None,0,0),
        ('heading-a',2,'Heading name','project-a',None,0,0),
        ('direct-task',0,'Direct','project-a',None,0,0),
        ('heading-task',0,'Via heading',None,'heading-a',0,0),
        ('both-task',0,'Both','project-a','heading-a',0,0),
        ('conflict-task',0,'Conflict','project-b','heading-a',0,0),
        ('no-project',0,'No project',None,None,0,0),
        ('dangling-project',0,'Broken','missing',None,0,0),
        ('dangling-heading',0,'Broken heading',None,'missing',0,0),
        ('blank-task',0,'Blank parent','blank-project',None,0,0),
        ('bad-type-task',0,'Wrong parent','heading-a',None,0,0),
        ('canceled-broken',0,'Canceled broken','missing',None,2,0),
        ('trashed-broken',0,'Trashed broken','missing',None,0,1),
    ]:
        db.execute('INSERT INTO TMTask(uuid,type,title,project,heading,status,trashed,start) VALUES (?,?,?,?,?,?,?,?)', (uuid,kind,title,project,heading,status,trashed,1))
    db.execute('INSERT INTO TMArea(uuid,title) VALUES (?,?)', ('area','Area only'))
    db.execute('UPDATE TMTask SET area=? WHERE uuid=?', ('area','no-project'))
    db.commit();db.close()
    selected = {task['uuid'] for task in things.today(filepath=str(path))}
    assert {'daytime', 'this-evening'} <= selected, selected
    complete_selection = {task['uuid'] for task in today_with_completed(filepath=str(path))}
    assert {'daytime', 'this-evening', 'completed-today'} <= complete_selection, complete_selection
    assert 'completed-yesterday' not in complete_selection, complete_selection
    for uuid,expected in [('done','completed'),('canceled','canceled'),('open','incomplete'),('trash','incomplete')]:
        item=things.get(uuid,filepath=str(path));assert item['status']==expected;assert bool(item.get('trashed',False))==(uuid=='trash')
    def category(uuid):
        raw = things.get(uuid,filepath=str(path))
        return enrich_categories([raw], filepath=str(path))[0]
    for uuid in ['direct-task','heading-task','both-task']:
        assert category(uuid)['project_category']=={'sourceId':'project-a','name':'Travel'}
    assert category('no-project')['project_category'] is None
    for uuid in ['canceled-broken','trashed-broken']:
        assert 'project_category' not in category(uuid)
    for uuid in ['dangling-project','dangling-heading','conflict-task','blank-task','bad-type-task']:
        try: category(uuid)
        except RuntimeError: pass
        else: raise AssertionError('Invalid relationship was not rejected: '+uuid)
    # Re-read after a rename; no project cache survives an operation.
    edit=sqlite3.connect(path);edit.execute('UPDATE TMTask SET title=? WHERE uuid=?', ('Renamed','project-a'));edit.commit();edit.close()
    assert category('direct-task')['project_category']['name']=='Renamed'
    clock=sqlite3.connect(':memory:')
    for stamp,expected in [('2026-11-01T03:59:00Z','2026-10-31'),('2026-11-01T04:00:00Z','2026-11-01'),('2026-03-08T04:59:00Z','2026-03-07'),('2026-03-08T05:00:00Z','2026-03-08')]:
        assert clock.execute("SELECT date(?,'localtime')",(stamp,)).fetchone()[0]==expected
print(json.dumps({'synthetic_completed_canceled_trash':'pass','new_york_midnight_dst':'pass','today_and_this_evening':'pass','completed_today_only':'pass','project_categories':'pass','unresolved_precedence':'pass'}))
