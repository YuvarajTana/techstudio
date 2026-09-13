from dataclasses import dataclass
from typing import Protocol

from sqlalchemy import or_
from sqlalchemy.orm import Query, Session

from database import Asset


@dataclass(frozen=True)
class AssetSearchInput:
    category: str | None = None
    theme: str | None = None
    search: str | None = None
    limit: int = 50
    offset: int = 0


@dataclass(frozen=True)
class AssetSearchResult:
    assets: list[Asset]
    total: int


class AssetProvider(Protocol):
    def search(self, input_data: AssetSearchInput) -> AssetSearchResult:
        ...

    def get_asset(self, asset_id: str) -> Asset | None:
        ...


class LocalDatabaseAssetProvider:
    def __init__(self, db: Session):
        self.db = db

    def search(self, input_data: AssetSearchInput) -> AssetSearchResult:
        query = self.db.query(Asset).filter(Asset.user_id.is_(None))
        if hasattr(Asset, "is_active"):
            query = query.filter(Asset.is_active.is_(True))
        if input_data.category:
            query = query.filter(Asset.category == input_data.category)

        query = self._apply_theme(query, input_data.theme)
        query = self._apply_search(query, input_data.search)

        total = query.count()
        if input_data.category == "images":
            order_columns = [Asset.id.asc()]
        else:
            order_columns = [Asset.use_count.desc(), Asset.name.asc(), Asset.id.asc()]

        assets = (
            query
            .order_by(*order_columns)
            .offset(input_data.offset)
            .limit(input_data.limit)
            .all()
        )
        return AssetSearchResult(assets=assets, total=total)

    def get_asset(self, asset_id: str) -> Asset | None:
        query = self.db.query(Asset).filter(Asset.id == asset_id, Asset.user_id.is_(None))
        if hasattr(Asset, "is_active"):
            query = query.filter(Asset.is_active.is_(True))
        return query.first()

    def _apply_theme(self, query: Query, theme: str | None) -> Query:
        if not theme:
            return query

        normalized_theme = theme.strip().lower()
        exact_category_query = query.filter(Asset.tags.ilike(f"%category:{normalized_theme}%"))
        if exact_category_query.count() > 0:
            return exact_category_query

        theme_terms = [term.strip() for term in normalized_theme.replace("-", " ").split() if term.strip()]
        theme_filters = []
        for term in theme_terms or [normalized_theme]:
            like_term = f"%{term}%"
            theme_filters.extend([
                Asset.name.ilike(like_term),
                Asset.tags.ilike(like_term),
            ])
        return query.filter(or_(*theme_filters))

    def _apply_search(self, query: Query, search: str | None) -> Query:
        if not search:
            return query

        terms = [term.strip() for term in search.split() if term.strip()]
        search_filters = []
        for term in terms or [search.strip()]:
            like_term = f"%{term}%"
            search_filters.extend([
                Asset.name.ilike(like_term),
                Asset.tags.ilike(like_term),
                Asset.category.ilike(like_term),
            ])
        return query.filter(or_(*search_filters))
