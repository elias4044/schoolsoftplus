import { NextRequest, NextResponse } from "next/server";

import {
  createSchoolsoftClient,
  requireSession,
} from "@/app/api/lib/schoolsoft";
import { handleApiError } from "@/app/api/lib/apiError";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// -- GET /api/news  ------------------------------------------------------------
export async function GET(req: NextRequest, context: RouteContext) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgid") ?? 18; // 18 is IES Halmstad's OrgID.

  const { id } = await context.params;

  if (!id) {
    NextResponse.json({ error: "Missing ID" });
  }

  const sess = await requireSession(req);

  if (!sess) {
    return NextResponse.json(
      { success: false, error: "Not authenticated." },
      { status: 401 },
    );
  }

  if (!sess.token) {
    return NextResponse.json(
      {
        success: false,
        error:
          "This route requires AuthV2 (https://developer.ssp.elias4044.com/docs/auth-v2). The legacy route is available at /api/news/legacy",
      },
      { status: 401 },
    );
  }

  if (!sess.user?.userId) {
    return NextResponse.json(
      {
        success: false,
        error: "UserId was not found.",
      },
      { status: 400 },
    );
  }

  const api = createSchoolsoftClient(sess.school);

  try {
    const res = await api.get(
      `/eva/api/v2/student/${sess.user.userId}/schools/${orgId}/news/${id}`,
      { headers: { Authorization: "Bearer " + sess.token } },
    );

    // TODO: Figure out attachments & images

    // Example res:
    // Note that the description is pure HTML
    /* 
    
        {
        "id": 332375,
        "title": "Summer reading & reading bingos!",
        "description": "[p class=\"tinymce-p\"][img style=\"max-width: 100%; height: auto; max-height: 100%;\" src=\"showFileImage.jsp?fileid=486924&amp;tn=1&amp;object=news&amp;requestid2=1&amp;requestid3=0&amp;requestid1=332375&amp;hash={{332375}}&amp;rnd=1779863945521\" alt=\"\" width=\"120\" /] [img style=\"max-width: 100%; height: auto; max-height: 100%;\" src=\"showFileImage.jsp?fileid=486976&amp;tn=1&amp;object=news&amp;requestid2=1&amp;requestid3=0&amp;requestid1=332375&amp;hash={{332375}}&amp;rnd=1779864187158\" alt=\"\" width=\"120\" /] [img style=\"max-width: 100%; height: auto; max-height: 100%;\" src=\"showFileImage.jsp?fileid=486977&amp;tn=1&amp;object=news&amp;requestid2=1&amp;requestid3=0&amp;requestid1=332375&amp;hash={{332375}}&amp;rnd=1779864385700\" alt=\"\" width=\"120\" /] [img style=\"max-width: 100%; height: auto; max-height: 100%;\" src=\"showFileImage.jsp?fileid=486978&amp;tn=1&amp;object=news&amp;requestid2=1&amp;requestid3=0&amp;requestid1=332375&amp;hash={{332375}}&amp;rnd=1779864404895\" alt=\"\" width=\"120\" /][/p]",
        "strippedDescription": "   ",
        "fromDate": "2026-05-31T22:00:00.000+00:00",
        "toDate": "2026-08-27T22:00:00.000+00:00",
        "category": "IES News",
        "author": {
            "id": 3030,
            "name": "Elias Gulam",
            "picture": "teacher4044.jpg.jpg"
        },
        "read": true,
        "responseLabel": "",
        "attachments": [
            {
            "fileId": 486924,
            "name": "25_26 Summer reading 2.jpg",
            "type": "IMAGE"
            },
            {
            "fileId": 486976,
            "name": "25_26 Summer Reading bingo x 3!_page-0005.jpg",
            "type": "IMAGE"
            },
            {
            "fileId": 486977,
            "name": "25_26 Summer Reading bingo x 3!_page-0001.jpg",
            "type": "IMAGE"
            },
            {
            "fileId": 486978,
            "name": "25_26 Summer Reading bingo x 3!_page-0003.jpg",
            "type": "IMAGE"
            },
            {
            "fileId": 486979,
            "name": "25_26 Summer Reading form.pdf",
            "type": "PDF"
            }
        ],
        "toTeacher": true,
        "toParent": true,
        "toStudent": true,
        "groupRecipients": [
            "8A",
            "7A",
            "8B",
            "6A",
            "7B",
            "8C",
            "5A",
            "6B",
            "7C",
            "4A",
            "5B",
            "6C",
            "4B",
            "5C",
            "4C"
        ],
        "teamRecipients": [],
        "orgId": 18
        }

        Another example:
        {
            "id": 330644,
            "title": "Sommarkombi - free summer activity or sum",
            "description": "[p class=\"tinymce-p\"][img style=\"max-width: 100%; height: auto; max-height: 100%;\" src=\"showFileImage.jsp?fileid=484927&amp;tn=1&amp;object=news&amp;requestid2=1&amp;requestid3=0&amp;requestid1=330644&amp;hash={{330644}}&amp;rnd=1778048605081\" alt=\"\" width=\"120\" /][/p]\n[p class=\"tinymce-p\"]I sommar startar Halmstads kommun en ny verksamhet inom Aktiv sommar. Kombihallen vid Halmstads Arena öppnas för 10&ndash;16-åringar varje vardag under sommarlovet med aktiviteter, utflykter och happenings![/p][ul][li]Pågår vecka 26&ndash;32.[/li][li]Planerade aktiviteter varje dag inom sport, kultur, skapande, spel och tävlingar.[/li][li]Drop-in måndag&ndash;fredag.[/li][li]Två olika tidspass för olika åldrar.[/li][li]10&ndash;12 år 12.30-16.30.[/li][li]13&ndash;16 år 17&ndash;21.[/li][li]Max 50 barn samtidigt öppen verksamhet. Utöver det styrs antal deltagare av verksamhetens karaktär.[/li][li]Utflykter två dagar i veckan.[/li][li]Lördagar extra aktiviteter vecka 27, 29 och 31. Mer information kommer senare.[/li][li]Bemanningen består av ungdomscoacher, föreningsledare och kulturaktörer.[/li][/ul]",
            "strippedDescription": "\nI sommar startar Halmstads kommun en ny verksamhet inom Aktiv sommar. Kombihallen vid Halmstads Arena öppnas för 10&ndash;16-åringar varje vardag under sommarlovet med aktiviteter, utflykter och happenings!Pågår vecka 26&ndash;32.Planerade aktiviteter varje dag inom sport, kultur, skapande, spel och tävlingar.Drop-in måndag&ndash;fredag.Två olika tidspass för olika åldrar.10&ndash;12 år 12.30-16.30.13&ndash;16 år 17&ndash;21.Max 50 barn samtidigt öppen verksamhet. Utöver det styrs antal deltagare av verksamhetens karaktär.Utflykter två dagar i veckan.Lördagar extra aktiviteter vecka 27, 29 och 31. Mer information kommer senare.Bemanningen består av ungdomscoacher, föreningsledare och kulturaktörer.",
            "fromDate": "2026-05-05T22:00:00.000+00:00",
            "toDate": "2026-08-06T22:00:00.000+00:00",
            "category": "IES News",
            "author": {
                "id": 4044,
                "name": "Elias Gulam",
                "picture": "teacher4044.jpg.jpg"
            },
            "read": true,
            "responseLabel": "",
            "attachments": [
                {
                "fileId": 484927,
                "name": "Scan_jonna.sikmar.halmstad_2026-05-05-09-15-52 (2)_page-0001.jpg",
                "type": "IMAGE"
                }
            ],
            "toTeacher": true,
            "toParent": true,
            "toStudent": true,
            "groupRecipients": [
                "Alla"
            ],
            "teamRecipients": [],
            "orgId": 18
            }
  */
    return NextResponse.json(res.data);
  } catch (err) {
    return handleApiError(err, "news");
  }
}
