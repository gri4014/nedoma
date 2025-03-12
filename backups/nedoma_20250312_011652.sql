--
-- PostgreSQL database dump
--

-- Dumped from database version 14.17 (Debian 14.17-1.pgdg120+1)
-- Dumped by pg_dump version 14.15 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: swipe_direction; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.swipe_direction AS ENUM (
    'left',
    'right',
    'up'
);


ALTER TYPE public.swipe_direction OWNER TO postgres;

--
-- Name: cleanup_expired_sessions(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.cleanup_expired_sessions() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  DELETE FROM sessions WHERE expires_at < NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.cleanup_expired_sessions() OWNER TO postgres;

--
-- Name: update_event_tags_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_event_tags_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_event_tags_updated_at() OWNER TO postgres;

--
-- Name: update_events_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_events_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_events_updated_at() OWNER TO postgres;

--
-- Name: update_last_active_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_last_active_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.last_active_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_last_active_at() OWNER TO postgres;

--
-- Name: update_timestamp(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_timestamp() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

--
-- Name: validate_event_subcategories(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_event_subcategories() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Check if all subcategories exist in categories table
    IF EXISTS (
        SELECT 1
        FROM unnest(NEW.subcategories) AS subcategory_id
        LEFT JOIN categories ON categories.id = subcategory_id
        WHERE categories.id IS NULL
    ) THEN
        RAISE EXCEPTION 'Invalid subcategory ID found';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_event_subcategories() OWNER TO postgres;

--
-- Name: validate_event_tag(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_event_tag() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    tag_type_val tag_type;
    possible_values_arr TEXT[];
    tag_subcategories UUID[];
    event_subcategories UUID[];
BEGIN
    -- Get tag info
    SELECT type, possible_values, subcategories INTO tag_type_val, possible_values_arr, tag_subcategories
    FROM tags WHERE id = NEW.tag_id;
    
    -- Get event subcategories
    SELECT subcategories INTO event_subcategories
    FROM events WHERE id = NEW.event_id;
    
    -- Validate tag values based on type
    IF tag_type_val = 'boolean' THEN
        IF array_length(NEW.tag_values, 1) != 1 OR NEW.tag_values[1] NOT IN ('true', 'false') THEN
            RAISE EXCEPTION 'Boolean tag must have exactly one value: true or false';
        END IF;
    ELSIF tag_type_val = 'categorical' AND possible_values_arr IS NOT NULL THEN
        IF NOT (SELECT bool_and(val = ANY(possible_values_arr)) FROM unnest(NEW.tag_values) AS val) THEN
            RAISE EXCEPTION 'Categorical tag values must be from the possible values list';
        END IF;
    END IF;
    
    -- Validate that tag is applicable to at least one of event's subcategories
    IF NOT (
        SELECT EXISTS (
            SELECT 1 
            FROM unnest(event_subcategories) AS event_subcat
            WHERE event_subcat = ANY(tag_subcategories)
        )
    ) THEN
        RAISE EXCEPTION 'Tag is not applicable to any of the event subcategories';
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_event_tag() OWNER TO postgres;

--
-- Name: validate_event_tag_values(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_event_tag_values() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    valid_values TEXT[];
BEGIN
    -- Get possible values for the tag
    SELECT possible_values INTO valid_values
    FROM tags WHERE id = NEW.tag_id;
    
    -- Check if all selected values are valid
    IF NOT (SELECT bool_and(val = ANY(valid_values)) 
            FROM unnest(NEW.selected_values) AS val) THEN
        RAISE EXCEPTION 'All selected values must be from the tag''s possible values';
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_event_tag_values() OWNER TO postgres;

--
-- Name: validate_subcategory_reference(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_subcategory_reference() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM categories
        WHERE id = NEW.subcategory_id AND parent_id IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Invalid subcategory: must reference a category with a parent';
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_subcategory_reference() OWNER TO postgres;

--
-- Name: validate_tag_values(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_tag_values() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    possible_values_arr TEXT[];
BEGIN
    -- Get possible values for this tag
    SELECT possible_values INTO possible_values_arr
    FROM tags WHERE id = NEW.tag_id;
    
    -- Check if all selected values are in the possible values array
    IF NOT (SELECT bool_and(val = ANY(possible_values_arr))
            FROM unnest(NEW.selected_values) AS val) THEN
        RAISE EXCEPTION 'Invalid tag values. Values must be among the tag''s possible values.';
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_tag_values() OWNER TO postgres;

--
-- Name: validate_user_tag_preference(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.validate_user_tag_preference() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    tag_type_val tag_type;
    possible_values_arr TEXT[];
BEGIN
    SELECT type, possible_values INTO tag_type_val, possible_values_arr
    FROM tags WHERE id = NEW.tag_id;
    
    IF tag_type_val = 'boolean' THEN
        IF NEW.value NOT IN ('true', 'false') THEN
            RAISE EXCEPTION 'Boolean tag value must be either "true" or "false"';
        END IF;
    ELSIF tag_type_val = 'categorical' THEN
        IF NOT (NEW.value = ANY(possible_values_arr)) THEN
            RAISE EXCEPTION 'Categorical tag value must be one of the possible values';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.validate_user_tag_preference() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: admins; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.admins (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    login character varying(255) NOT NULL,
    password_hash text NOT NULL,
    last_login timestamp without time zone,
    is_active boolean DEFAULT true,
    role character varying(20) DEFAULT 'ADMIN'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.admins OWNER TO postgres;

--
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    parent_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- Name: event_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.event_tags (
    event_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    selected_values text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.event_tags OWNER TO postgres;

--
-- Name: events; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    short_description text NOT NULL,
    long_description text,
    image_urls text[] DEFAULT '{}'::text[],
    links text[] DEFAULT '{}'::text[],
    event_dates timestamp with time zone[] NOT NULL,
    address text,
    is_active boolean DEFAULT true NOT NULL,
    is_free boolean DEFAULT true NOT NULL,
    price_range jsonb,
    subcategories uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    display_dates boolean DEFAULT true NOT NULL,
    CONSTRAINT short_description_length_check CHECK ((length(short_description) <= 160))
);


ALTER TABLE public.events OWNER TO postgres;

--
-- Name: migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.migrations OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.migrations_id_seq OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: subcategories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subcategories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    category_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    display_order integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.subcategories OWNER TO postgres;

--
-- Name: swipes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.swipes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    event_id uuid,
    direction public.swipe_direction NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.swipes OWNER TO postgres;

--
-- Name: tag_subcategories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tag_subcategories (
    tag_id uuid NOT NULL,
    subcategory_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tag_subcategories OWNER TO postgres;

--
-- Name: tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tags (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    possible_values text[] DEFAULT '{}'::text[] NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    subcategories uuid[] DEFAULT '{}'::uuid[]
);


ALTER TABLE public.tags OWNER TO postgres;

--
-- Name: tags_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tags_categories (
    tag_id uuid NOT NULL,
    category_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tags_categories OWNER TO postgres;

--
-- Name: user_category_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_category_preferences (
    id integer NOT NULL,
    user_id uuid,
    subcategory_id uuid,
    level integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_category_preferences_level_check CHECK (((level >= 0) AND (level <= 2)))
);


ALTER TABLE public.user_category_preferences OWNER TO postgres;

--
-- Name: user_category_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_category_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_category_preferences_id_seq OWNER TO postgres;

--
-- Name: user_category_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_category_preferences_id_seq OWNED BY public.user_category_preferences.id;


--
-- Name: user_tag_preferences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_tag_preferences (
    id integer NOT NULL,
    user_id uuid,
    tag_id uuid,
    selected_values text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_tag_preferences OWNER TO postgres;

--
-- Name: user_tag_preferences_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_tag_preferences_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.user_tag_preferences_id_seq OWNER TO postgres;

--
-- Name: user_tag_preferences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_tag_preferences_id_seq OWNED BY public.user_tag_preferences.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    telegram_id bigint NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    temp_id uuid DEFAULT public.uuid_generate_v4(),
    last_active_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: user_category_preferences id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_category_preferences ALTER COLUMN id SET DEFAULT nextval('public.user_category_preferences_id_seq'::regclass);


--
-- Name: user_tag_preferences id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tag_preferences ALTER COLUMN id SET DEFAULT nextval('public.user_tag_preferences_id_seq'::regclass);


--
-- Data for Name: admins; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.admins (id, login, password_hash, last_login, is_active, role, created_at, updated_at) FROM stdin;
d16b0246-5ce0-449b-a789-758f29afad9e	admin	$2b$10$3IXhqHgGZnxTXgLJJcJ8L.Ld9Qz7gkO7OHvwxvhxvyWtGDGrwykPi	\N	t	ADMIN	2025-03-12 03:45:40.628814	2025-03-12 03:45:40.628814
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.categories (id, name, parent_id, created_at, updated_at, is_active, display_order) FROM stdin;
b4c65b23-626a-42e8-853d-f68410eb0b8a	Бои	d290f1ee-6c54-4b01-90e6-d701748f0851	2025-03-09 08:38:29.274185+00	2025-03-12 03:45:40.636313+00	t	10
405b21f9-2157-4256-b261-16497fa31638	Игровой досуг	d290f1ee-6c54-4b01-90e6-d701748f0853	2025-03-09 08:38:29.274185+00	2025-03-12 03:45:40.636313+00	t	10
06a3c28f-0b19-4088-bb1a-d8d692135436	Кино	d290f1ee-6c54-4b01-90e6-d701748f0852	2025-03-09 08:38:29.274185+00	2025-03-12 03:45:40.636313+00	t	10
52e5a58b-a627-4f43-8f12-79bf08ee3cb5	Клубы, бары, рюмочные	d290f1ee-6c54-4b01-90e6-d701748f0853	2025-03-09 08:38:29.274185+00	2025-03-12 03:45:40.636313+00	t	10
ea6f91da-f8ee-4159-a702-eb042e246404	Концерты	d290f1ee-6c54-4b01-90e6-d701748f0852	2025-03-09 08:38:29.274185+00	2025-03-12 03:45:40.636313+00	t	10
d290f1ee-6c54-4b01-90e6-d701748f0852	Культура	\N	2025-03-09 08:38:29.274185+00	2025-03-12 03:45:40.636313+00	t	10
d290f1ee-6c54-4b01-90e6-d701748f0853	Развлечения	\N	2025-03-09 08:38:29.274185+00	2025-03-12 03:45:40.636313+00	t	10
bb4fd575-53d3-4c92-8c8a-a175a718033d	Рестораны, кафе	d290f1ee-6c54-4b01-90e6-d701748f0853	2025-03-09 08:38:29.274185+00	2025-03-12 03:45:40.636313+00	t	10
d290f1ee-6c54-4b01-90e6-d701748f0851	Спорт	\N	2025-03-09 08:38:29.274185+00	2025-03-12 03:45:40.636313+00	t	10
4affb85f-6b8a-42c6-a832-1d57b568c0e4	Стендапы	d290f1ee-6c54-4b01-90e6-d701748f0852	2025-03-09 08:38:29.274185+00	2025-03-12 03:45:40.636313+00	t	10
dcaf0251-ffaa-4582-b241-af7a3b630ff5	Театры	d290f1ee-6c54-4b01-90e6-d701748f0852	2025-03-09 08:38:29.274185+00	2025-03-12 03:45:40.636313+00	t	10
087cf0ae-8dd9-4ec1-a578-e2f494ad28c7	Теннис	d290f1ee-6c54-4b01-90e6-d701748f0851	2025-03-09 08:38:29.274185+00	2025-03-12 03:45:40.636313+00	t	10
ebe690b6-1fe7-4f1d-9468-1a0c06b1ed7e	Футбол	d290f1ee-6c54-4b01-90e6-d701748f0851	2025-03-09 08:38:29.274185+00	2025-03-12 03:45:40.636313+00	t	10
daabcc92-0baf-4308-bce8-1dd65da03c8c	Хоккей	d290f1ee-6c54-4b01-90e6-d701748f0851	2025-03-09 08:38:29.274185+00	2025-03-12 03:45:40.636313+00	t	10
\.


--
-- Data for Name: event_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.event_tags (event_id, tag_id, selected_values, created_at, updated_at) FROM stdin;
5c3143af-5b82-4a7c-aedd-f411e83e81ba	69740ea8-72ff-4581-a9a5-eab431c7ea93	{gfdfgfd}	2025-03-12 04:13:01.995555+00	2025-03-12 04:13:01.995555+00
a14f29fb-bde7-4e34-951d-e10c1e71620e	69740ea8-72ff-4581-a9a5-eab431c7ea93	{gfddfgfds}	2025-03-12 04:16:19.263714+00	2025-03-12 04:16:19.263714+00
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.events (id, name, short_description, long_description, image_urls, links, event_dates, address, is_active, is_free, price_range, subcategories, created_at, updated_at, display_dates) FROM stdin;
5c3143af-5b82-4a7c-aedd-f411e83e81ba	hgfds	jhgfrew	jhgfrew	{http://localhost:3002/uploads/events/1741752781965-1741752781850-393310601.png}	{https://apple.com}	{"2025-03-20 04:12:00+00"}	-	t	t	\N	{06a3c28f-0b19-4088-bb1a-d8d692135436}	2025-03-12 04:13:02.056+00	2025-03-12 04:13:02.056+00	t
a14f29fb-bde7-4e34-951d-e10c1e71620e	dfghjk	ghjiuyt	ghjiuyt	{http://localhost:3002/uploads/events/1741752979216-1741752979177-379762084.png}	{https://apple.com}	{"2025-03-11 04:15:00+00"}	-	t	t	\N	{06a3c28f-0b19-4088-bb1a-d8d692135436}	2025-03-12 04:16:19.304+00	2025-03-12 04:16:19.304+00	t
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.migrations (id, name, executed_at) FROM stdin;
1	000_create_extensions.sql	2025-03-12 03:45:40.447396
2	001_create_update_function.sql	2025-03-12 03:45:40.465228
3	001_create_update_timestamp_function.sql	2025-03-12 03:45:40.489915
4	002_create_users_table.sql	2025-03-12 03:45:40.491675
5	002a_create_users_table.sql	2025-03-12 03:45:40.523185
6	003_create_categories_table.sql	2025-03-12 03:45:40.525119
7	004_create_events_table.sql	2025-03-12 03:45:40.55227
8	004a_create_events_indexes.sql	2025-03-12 03:45:40.560297
9	005_create_tags_table.sql	2025-03-12 03:45:40.602338
10	008_create_admin_table.sql	2025-03-12 03:45:40.618891
11	009_create_swipes_and_preferences.sql	2025-03-12 03:45:40.626267
12	010_add_initial_admin.sql	2025-03-12 03:45:40.628814
13	011_create_sessions_table.sql	2025-03-12 03:45:40.633535
14	012_add_category_columns.sql	2025-03-12 03:45:40.636313
15	013_update_tags_for_multiple_categories.sql	2025-03-12 03:45:40.644322
16	014_add_is_active_to_tags.sql	2025-03-12 03:45:40.646464
17	015_fix_tag_categories_trigger.sql	2025-03-12 03:45:40.650655
18	016_fix_tags_structure.sql	2025-03-12 03:45:40.657396
19	016_remove_tag_categories_trigger.sql	2025-03-12 03:45:40.65957
20	017_add_tag_category_validation.sql	2025-03-12 03:45:40.660959
21	017_fix_tags_columns.sql	2025-03-12 03:45:40.693214
22	018_add_tag_categories_constraints.sql	2025-03-12 03:45:40.695823
23	019_remove_tag_categories.sql	2025-03-12 03:45:40.698539
24	020_fix_event_columns.sql	2025-03-12 03:45:40.740037
25	021_fix_event_tags.sql	2025-03-12 03:45:40.775731
26	021_update_tag_system.sql	2025-03-12 03:45:40.792533
27	022_add_event_subcategories.sql	2025-03-12 03:45:40.806049
28	023_setup_event_tags.sql	2025-03-12 03:45:40.833086
29	024_create_events_table.sql	2025-03-12 03:45:40.854816
30	025_add_device_id_to_users.sql	2025-03-12 03:45:40.880265
31	025_create_users_with_device_id.sql	2025-03-12 03:45:40.881254
32	026_modify_users_table.sql	2025-03-12 03:45:40.886077
33	028_update_subcategory_names.sql	2025-03-12 03:45:40.887918
34	029_revert_subcategory_names.sql	2025-03-12 03:45:40.892217
35	030_add_tag_subcategories.sql	2025-03-12 03:45:40.89844
36	031_create_subcategories_table.sql	2025-03-12 03:45:40.900572
37	031_fix_event_tags_table.sql	2025-03-12 03:45:40.908704
38	031a_update_tag_system.sql	2025-03-12 03:45:40.923195
39	032_simplify_users_table.sql	2025-03-12 03:45:40.941102
40	033_create_tag_preferences.sql	2025-03-12 03:45:40.945177
41	034_sync_user_preferences.sql	2025-03-12 03:45:40.96935
42	034a_add_tag_validation.sql	2025-03-12 03:45:40.978492
43	035_fix_user_id_types.sql	2025-03-12 03:45:40.997864
44	036_update_preferences_table.sql	2025-03-12 03:45:41.003346
45	036_update_preferences_to_use_subcategories.sql	2025-03-12 03:45:41.007729
46	037_fix_preferences_foreign_key.sql	2025-03-12 03:45:41.015101
47	038_rename_preference_level_column.sql	2025-03-12 03:45:41.01747
48	039_add_subcategory_display_order.sql	2025-03-12 03:45:41.021707
49	039_fix_preferences_column_and_constraints.sql	2025-03-12 03:45:41.024842
50	040_fix_preferences_table_structure.sql	2025-03-12 03:45:41.033066
51	040_update_level_constraint.sql	2025-03-12 03:45:41.037261
52	041_fix_category_preferences_fk.sql	2025-03-12 03:45:41.038072
53	041_remove_is_active_from_subcategories.sql	2025-03-12 03:45:41.044216
54	042_add_display_order_to_subcategories.sql	2025-03-12 03:45:41.046662
55	043_update_events_for_optional_dates.sql	2025-03-12 03:45:41.047629
56	044_make_long_description_optional.sql	2025-03-12 03:45:41.050077
57	045_limit_short_description_length.sql	2025-03-12 03:45:41.051718
58	049_make_address_optional.sql	2025-03-12 03:45:41.053537
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sessions (id, user_id, token, expires_at, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: subcategories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.subcategories (id, name, category_id, created_at, updated_at, display_order) FROM stdin;
\.


--
-- Data for Name: swipes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.swipes (id, user_id, event_id, direction, created_at, updated_at) FROM stdin;
a6a2848c-22fd-4842-8f94-66af19e23a8c	e3f592c9-bfdb-46e5-8a84-54cc5e0b768b	09dd24be-a2f5-419a-bd94-159bc077b466	right	2025-03-09 10:34:38.328908+00	2025-03-09 10:34:38.328908+00
53478713-c7f4-4fcc-9c08-78f4044e4847	cb2e7251-ba56-4710-aa56-3eb9fbcaeb5b	09dd24be-a2f5-419a-bd94-159bc077b466	right	2025-03-09 10:36:57.819508+00	2025-03-09 10:36:57.819508+00
efcdb64d-aa36-423e-b3ac-63376864dd3e	fd8d17c1-e77c-4ae1-bb32-bcd010a00c3a	09dd24be-a2f5-419a-bd94-159bc077b466	right	2025-03-12 03:41:21.591642+00	2025-03-12 03:41:21.591642+00
df1ac386-8d83-42d9-93f4-56be35247a7c	86e6a235-dfab-4062-ae8c-274d0d1af0cb	5c3143af-5b82-4a7c-aedd-f411e83e81ba	right	2025-03-12 04:16:25.797664+00	2025-03-12 04:16:25.797664+00
8569fdb1-65a2-416f-bad5-01237932df7b	86e6a235-dfab-4062-ae8c-274d0d1af0cb	a14f29fb-bde7-4e34-951d-e10c1e71620e	right	2025-03-12 04:16:26.490956+00	2025-03-12 04:16:26.490956+00
a4fd6a01-04ff-4ef9-979c-46db6353341c	ca266ca5-8ca0-4144-ba6e-f509addcad01	5c3143af-5b82-4a7c-aedd-f411e83e81ba	right	2025-03-12 04:25:01.973081+00	2025-03-12 04:25:01.973081+00
8186812d-ff8a-4dba-a3ac-9e6d92bc2e71	ca266ca5-8ca0-4144-ba6e-f509addcad01	a14f29fb-bde7-4e34-951d-e10c1e71620e	left	2025-03-12 04:25:03.444022+00	2025-03-12 04:25:03.444022+00
f1a6c6f0-a971-42fd-be73-98af3dbb8f0f	a0041c8d-fb2c-4ed5-94d2-00de64a2739c	5c3143af-5b82-4a7c-aedd-f411e83e81ba	right	2025-03-12 04:25:55.251968+00	2025-03-12 04:25:55.251968+00
259a7925-681a-489c-a1cc-444b2f485561	a0041c8d-fb2c-4ed5-94d2-00de64a2739c	a14f29fb-bde7-4e34-951d-e10c1e71620e	right	2025-03-12 04:25:56.095976+00	2025-03-12 04:25:56.095976+00
67c63536-1d08-41ec-bf4d-87f6c805fe15	a08b27fc-8ade-496f-867d-bedb0dcc012a	5c3143af-5b82-4a7c-aedd-f411e83e81ba	right	2025-03-12 04:26:49.047204+00	2025-03-12 04:26:49.047204+00
d02f9a3b-dbb0-457a-a3a4-b84fbd792ebd	a08b27fc-8ade-496f-867d-bedb0dcc012a	a14f29fb-bde7-4e34-951d-e10c1e71620e	left	2025-03-12 04:26:50.698231+00	2025-03-12 04:26:50.698231+00
00e8896e-4236-4868-88ee-fb9e5b15de63	5aff2ad1-672e-4a0c-a1c8-822bdb1b296d	5c3143af-5b82-4a7c-aedd-f411e83e81ba	right	2025-03-12 04:27:51.91549+00	2025-03-12 04:27:51.91549+00
a849be77-8ab8-4a04-a389-88b04eab327b	5aff2ad1-672e-4a0c-a1c8-822bdb1b296d	a14f29fb-bde7-4e34-951d-e10c1e71620e	left	2025-03-12 04:27:52.866449+00	2025-03-12 04:27:52.866449+00
273301cb-e483-4009-bc31-fc43b0951069	a5cad313-0e35-43b9-91c8-1ff241e2790d	5c3143af-5b82-4a7c-aedd-f411e83e81ba	left	2025-03-12 04:28:54.513424+00	2025-03-12 04:28:54.513424+00
4ff2951f-9cd6-461e-b556-91476e7c4b74	a5cad313-0e35-43b9-91c8-1ff241e2790d	a14f29fb-bde7-4e34-951d-e10c1e71620e	right	2025-03-12 04:28:55.276594+00	2025-03-12 04:28:55.276594+00
64402437-36f5-4e5e-bf5c-c4b13c6b8bc2	1b92da93-5b14-43d1-b5c8-2edc44f6b705	5c3143af-5b82-4a7c-aedd-f411e83e81ba	right	2025-03-12 04:46:20.186052+00	2025-03-12 04:46:20.186052+00
206875f0-f372-4bf4-8e46-4d1903c3d295	6fbd0341-de43-489e-859e-8738339484e0	5c3143af-5b82-4a7c-aedd-f411e83e81ba	right	2025-03-12 04:52:05.849097+00	2025-03-12 04:52:05.849097+00
5dbceb17-9714-4192-841b-da367e570867	6fbd0341-de43-489e-859e-8738339484e0	a14f29fb-bde7-4e34-951d-e10c1e71620e	right	2025-03-12 04:52:06.725209+00	2025-03-12 04:52:06.725209+00
\.


--
-- Data for Name: tag_subcategories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tag_subcategories (tag_id, subcategory_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tags (id, name, possible_values, is_active, created_at, updated_at, subcategories) FROM stdin;
69740ea8-72ff-4581-a9a5-eab431c7ea93	hgtrertre	{gfdfgfd,gfddfgfds}	t	2025-03-12 03:47:41.570058+00	2025-03-12 03:47:41.570058+00	{}
\.


--
-- Data for Name: tags_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.tags_categories (tag_id, category_id, created_at, updated_at) FROM stdin;
69740ea8-72ff-4581-a9a5-eab431c7ea93	06a3c28f-0b19-4088-bb1a-d8d692135436	2025-03-12 03:47:41.570058+00	2025-03-12 03:47:41.570058+00
\.


--
-- Data for Name: user_category_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_category_preferences (id, user_id, subcategory_id, level, created_at, updated_at) FROM stdin;
1	a7ab63e6-2dc4-401f-aed5-a80a80a8b0a7	ea6f91da-f8ee-4159-a702-eb042e246404	1	2025-03-12 03:47:27.730333+00	2025-03-12 03:47:27.730333+00
2	a7ab63e6-2dc4-401f-aed5-a80a80a8b0a7	4affb85f-6b8a-42c6-a832-1d57b568c0e4	1	2025-03-12 03:47:27.730333+00	2025-03-12 03:47:27.730333+00
3	a7ab63e6-2dc4-401f-aed5-a80a80a8b0a7	06a3c28f-0b19-4088-bb1a-d8d692135436	1	2025-03-12 03:47:27.730333+00	2025-03-12 03:47:27.730333+00
4	a7ab63e6-2dc4-401f-aed5-a80a80a8b0a7	dcaf0251-ffaa-4582-b241-af7a3b630ff5	1	2025-03-12 03:47:27.730333+00	2025-03-12 03:47:27.730333+00
5	86e6a235-dfab-4062-ae8c-274d0d1af0cb	ea6f91da-f8ee-4159-a702-eb042e246404	1	2025-03-12 04:14:21.803821+00	2025-03-12 04:14:21.803821+00
6	86e6a235-dfab-4062-ae8c-274d0d1af0cb	dcaf0251-ffaa-4582-b241-af7a3b630ff5	1	2025-03-12 04:14:21.803821+00	2025-03-12 04:14:21.803821+00
7	86e6a235-dfab-4062-ae8c-274d0d1af0cb	06a3c28f-0b19-4088-bb1a-d8d692135436	1	2025-03-12 04:14:21.803821+00	2025-03-12 04:14:21.803821+00
8	86e6a235-dfab-4062-ae8c-274d0d1af0cb	4affb85f-6b8a-42c6-a832-1d57b568c0e4	1	2025-03-12 04:14:21.803821+00	2025-03-12 04:14:21.803821+00
9	ca266ca5-8ca0-4144-ba6e-f509addcad01	ea6f91da-f8ee-4159-a702-eb042e246404	1	2025-03-12 04:24:52.153194+00	2025-03-12 04:24:52.153194+00
10	ca266ca5-8ca0-4144-ba6e-f509addcad01	06a3c28f-0b19-4088-bb1a-d8d692135436	1	2025-03-12 04:24:52.153194+00	2025-03-12 04:24:52.153194+00
11	ca266ca5-8ca0-4144-ba6e-f509addcad01	dcaf0251-ffaa-4582-b241-af7a3b630ff5	1	2025-03-12 04:24:52.153194+00	2025-03-12 04:24:52.153194+00
12	ca266ca5-8ca0-4144-ba6e-f509addcad01	4affb85f-6b8a-42c6-a832-1d57b568c0e4	1	2025-03-12 04:24:52.153194+00	2025-03-12 04:24:52.153194+00
13	a0041c8d-fb2c-4ed5-94d2-00de64a2739c	dcaf0251-ffaa-4582-b241-af7a3b630ff5	1	2025-03-12 04:25:46.856236+00	2025-03-12 04:25:46.856236+00
14	a0041c8d-fb2c-4ed5-94d2-00de64a2739c	06a3c28f-0b19-4088-bb1a-d8d692135436	1	2025-03-12 04:25:46.856236+00	2025-03-12 04:25:46.856236+00
15	a0041c8d-fb2c-4ed5-94d2-00de64a2739c	ea6f91da-f8ee-4159-a702-eb042e246404	1	2025-03-12 04:25:46.856236+00	2025-03-12 04:25:46.856236+00
16	a0041c8d-fb2c-4ed5-94d2-00de64a2739c	4affb85f-6b8a-42c6-a832-1d57b568c0e4	1	2025-03-12 04:25:46.856236+00	2025-03-12 04:25:46.856236+00
17	a08b27fc-8ade-496f-867d-bedb0dcc012a	ea6f91da-f8ee-4159-a702-eb042e246404	1	2025-03-12 04:26:44.209648+00	2025-03-12 04:26:44.209648+00
18	a08b27fc-8ade-496f-867d-bedb0dcc012a	dcaf0251-ffaa-4582-b241-af7a3b630ff5	1	2025-03-12 04:26:44.209648+00	2025-03-12 04:26:44.209648+00
19	a08b27fc-8ade-496f-867d-bedb0dcc012a	06a3c28f-0b19-4088-bb1a-d8d692135436	1	2025-03-12 04:26:44.209648+00	2025-03-12 04:26:44.209648+00
20	a08b27fc-8ade-496f-867d-bedb0dcc012a	4affb85f-6b8a-42c6-a832-1d57b568c0e4	1	2025-03-12 04:26:44.209648+00	2025-03-12 04:26:44.209648+00
21	5aff2ad1-672e-4a0c-a1c8-822bdb1b296d	06a3c28f-0b19-4088-bb1a-d8d692135436	1	2025-03-12 04:27:47.175334+00	2025-03-12 04:27:47.175334+00
22	5aff2ad1-672e-4a0c-a1c8-822bdb1b296d	4affb85f-6b8a-42c6-a832-1d57b568c0e4	1	2025-03-12 04:27:47.175334+00	2025-03-12 04:27:47.175334+00
23	5aff2ad1-672e-4a0c-a1c8-822bdb1b296d	ea6f91da-f8ee-4159-a702-eb042e246404	1	2025-03-12 04:27:47.175334+00	2025-03-12 04:27:47.175334+00
24	5aff2ad1-672e-4a0c-a1c8-822bdb1b296d	dcaf0251-ffaa-4582-b241-af7a3b630ff5	1	2025-03-12 04:27:47.175334+00	2025-03-12 04:27:47.175334+00
25	a5cad313-0e35-43b9-91c8-1ff241e2790d	ea6f91da-f8ee-4159-a702-eb042e246404	1	2025-03-12 04:28:50.000671+00	2025-03-12 04:28:50.000671+00
26	a5cad313-0e35-43b9-91c8-1ff241e2790d	dcaf0251-ffaa-4582-b241-af7a3b630ff5	1	2025-03-12 04:28:50.000671+00	2025-03-12 04:28:50.000671+00
27	a5cad313-0e35-43b9-91c8-1ff241e2790d	06a3c28f-0b19-4088-bb1a-d8d692135436	1	2025-03-12 04:28:50.000671+00	2025-03-12 04:28:50.000671+00
28	a5cad313-0e35-43b9-91c8-1ff241e2790d	4affb85f-6b8a-42c6-a832-1d57b568c0e4	1	2025-03-12 04:28:50.000671+00	2025-03-12 04:28:50.000671+00
29	1b92da93-5b14-43d1-b5c8-2edc44f6b705	ea6f91da-f8ee-4159-a702-eb042e246404	1	2025-03-12 04:34:41.921419+00	2025-03-12 04:34:41.921419+00
30	1b92da93-5b14-43d1-b5c8-2edc44f6b705	4affb85f-6b8a-42c6-a832-1d57b568c0e4	1	2025-03-12 04:34:41.921419+00	2025-03-12 04:34:41.921419+00
31	1b92da93-5b14-43d1-b5c8-2edc44f6b705	06a3c28f-0b19-4088-bb1a-d8d692135436	1	2025-03-12 04:34:41.921419+00	2025-03-12 04:34:41.921419+00
32	1b92da93-5b14-43d1-b5c8-2edc44f6b705	dcaf0251-ffaa-4582-b241-af7a3b630ff5	1	2025-03-12 04:34:41.921419+00	2025-03-12 04:34:41.921419+00
33	6fbd0341-de43-489e-859e-8738339484e0	ea6f91da-f8ee-4159-a702-eb042e246404	1	2025-03-12 04:46:45.234271+00	2025-03-12 04:46:45.234271+00
34	6fbd0341-de43-489e-859e-8738339484e0	dcaf0251-ffaa-4582-b241-af7a3b630ff5	1	2025-03-12 04:46:45.234271+00	2025-03-12 04:46:45.234271+00
35	6fbd0341-de43-489e-859e-8738339484e0	06a3c28f-0b19-4088-bb1a-d8d692135436	1	2025-03-12 04:46:45.234271+00	2025-03-12 04:46:45.234271+00
36	6fbd0341-de43-489e-859e-8738339484e0	4affb85f-6b8a-42c6-a832-1d57b568c0e4	1	2025-03-12 04:46:45.234271+00	2025-03-12 04:46:45.234271+00
37	826bef51-5a1b-4c64-a8e5-391109029d56	ea6f91da-f8ee-4159-a702-eb042e246404	1	2025-03-12 04:52:20.263168+00	2025-03-12 04:52:20.263168+00
38	826bef51-5a1b-4c64-a8e5-391109029d56	06a3c28f-0b19-4088-bb1a-d8d692135436	1	2025-03-12 04:52:20.263168+00	2025-03-12 04:52:20.263168+00
39	826bef51-5a1b-4c64-a8e5-391109029d56	4affb85f-6b8a-42c6-a832-1d57b568c0e4	1	2025-03-12 04:52:20.263168+00	2025-03-12 04:52:20.263168+00
40	826bef51-5a1b-4c64-a8e5-391109029d56	dcaf0251-ffaa-4582-b241-af7a3b630ff5	1	2025-03-12 04:52:20.263168+00	2025-03-12 04:52:20.263168+00
\.


--
-- Data for Name: user_tag_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_tag_preferences (id, user_id, tag_id, selected_values, created_at, updated_at) FROM stdin;
1	86e6a235-dfab-4062-ae8c-274d0d1af0cb	69740ea8-72ff-4581-a9a5-eab431c7ea93	{gfdfgfd}	2025-03-12 04:14:23.395912+00	2025-03-12 04:14:23.395912+00
2	ca266ca5-8ca0-4144-ba6e-f509addcad01	69740ea8-72ff-4581-a9a5-eab431c7ea93	{gfdfgfd}	2025-03-12 04:24:53.913518+00	2025-03-12 04:24:53.913518+00
3	a0041c8d-fb2c-4ed5-94d2-00de64a2739c	69740ea8-72ff-4581-a9a5-eab431c7ea93	{gfdfgfd}	2025-03-12 04:25:48.759002+00	2025-03-12 04:25:48.759002+00
4	a08b27fc-8ade-496f-867d-bedb0dcc012a	69740ea8-72ff-4581-a9a5-eab431c7ea93	{gfdfgfd}	2025-03-12 04:26:45.833915+00	2025-03-12 04:26:45.833915+00
5	5aff2ad1-672e-4a0c-a1c8-822bdb1b296d	69740ea8-72ff-4581-a9a5-eab431c7ea93	{gfdfgfd}	2025-03-12 04:27:49.017172+00	2025-03-12 04:27:49.017172+00
6	a5cad313-0e35-43b9-91c8-1ff241e2790d	69740ea8-72ff-4581-a9a5-eab431c7ea93	{gfdfgfd}	2025-03-12 04:28:52.015186+00	2025-03-12 04:28:52.015186+00
7	1b92da93-5b14-43d1-b5c8-2edc44f6b705	69740ea8-72ff-4581-a9a5-eab431c7ea93	{gfdfgfd}	2025-03-12 04:34:43.543477+00	2025-03-12 04:34:43.543477+00
8	6fbd0341-de43-489e-859e-8738339484e0	69740ea8-72ff-4581-a9a5-eab431c7ea93	{gfdfgfd}	2025-03-12 04:46:46.711723+00	2025-03-12 04:46:46.711723+00
9	826bef51-5a1b-4c64-a8e5-391109029d56	69740ea8-72ff-4581-a9a5-eab431c7ea93	{gfdfgfd}	2025-03-12 04:52:26.18675+00	2025-03-12 04:52:26.18675+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, telegram_id, created_at, updated_at, temp_id, last_active_at) FROM stdin;
28406455-fed5-481e-ac26-3ddb5da64571	567876545	2025-03-09 08:41:44.945445+00	2025-03-09 08:41:44.945445+00	d084dd41-4354-4c7e-8eb0-3e3059945d0a	2025-03-09 08:41:44.945445+00
feff3d32-2c3b-446b-a1dc-60e100e4f8b8	5647389287364	2025-03-09 09:40:16.093251+00	2025-03-09 09:40:16.093251+00	da7b7511-56bb-480e-ac04-2b13bf60d989	2025-03-09 09:40:16.093251+00
e3f592c9-bfdb-46e5-8a84-54cc5e0b768b	567890	2025-03-09 10:34:30.405356+00	2025-03-09 10:34:30.405356+00	31b22be8-202e-4535-98e3-f43a0f4164d7	2025-03-09 10:34:30.405356+00
cb2e7251-ba56-4710-aa56-3eb9fbcaeb5b	7817127	2025-03-09 10:35:44.243007+00	2025-03-09 10:35:44.243007+00	85f5536f-37c3-4f9a-baef-f5270e944251	2025-03-09 10:35:44.243007+00
51a2bcf9-f80e-4fb5-9246-3ba34dc569f9	383734889472947	2025-03-09 10:53:18.469771+00	2025-03-09 10:53:18.469771+00	960f3e73-dcdb-4e7b-8076-94cb37d0f4f8	2025-03-09 10:53:18.469771+00
ef20f5f5-2472-4cfd-8bb5-90418851280b	765432	2025-03-10 02:46:29.493482+00	2025-03-10 02:46:29.493482+00	0ff90dcc-0a9a-4d03-8ac1-e54eb12be144	2025-03-10 02:46:29.493482+00
fd8d17c1-e77c-4ae1-bb32-bcd010a00c3a	4567890	2025-03-12 02:46:58.511036+00	2025-03-12 02:46:58.511036+00	ef1ed394-9115-416e-9037-1e927467592d	2025-03-12 02:46:58.511036+00
a7ab63e6-2dc4-401f-aed5-a80a80a8b0a7	76543456	2025-03-12 03:47:24.220119+00	2025-03-12 03:47:24.220119+00	b51638e3-3a9e-46d3-990b-488cb1249f33	2025-03-12 03:47:24.220119+00
86e6a235-dfab-4062-ae8c-274d0d1af0cb	3456789	2025-03-12 04:14:18.116714+00	2025-03-12 04:14:18.116714+00	c9e62c83-ed78-4f20-aa54-8a9e6bb59054	2025-03-12 04:14:18.116714+00
ca266ca5-8ca0-4144-ba6e-f509addcad01	5678909876	2025-03-12 04:24:49.042807+00	2025-03-12 04:24:49.042807+00	2a099600-4971-49db-94c5-746ca43413dd	2025-03-12 04:24:49.042807+00
a0041c8d-fb2c-4ed5-94d2-00de64a2739c	47839210	2025-03-12 04:25:43.636151+00	2025-03-12 04:25:43.636151+00	71231a66-bef7-4c63-b071-7fe6c34803d1	2025-03-12 04:25:43.636151+00
a08b27fc-8ade-496f-867d-bedb0dcc012a	567898765678	2025-03-12 04:26:40.875139+00	2025-03-12 04:26:40.875139+00	81e2ee9d-7e53-4c44-99a3-6f5086780bb0	2025-03-12 04:26:40.875139+00
5aff2ad1-672e-4a0c-a1c8-822bdb1b296d	87654345678	2025-03-12 04:27:44.467159+00	2025-03-12 04:27:44.467159+00	a9eb496f-daec-401a-a0b1-65d745bff142	2025-03-12 04:27:44.467159+00
958fea75-ad31-4417-9b91-853a074e25d9	765434567	2025-03-12 04:28:42.131586+00	2025-03-12 04:28:42.131586+00	3faedf06-88b6-40e6-b8c5-975427131075	2025-03-12 04:28:42.131586+00
a5cad313-0e35-43b9-91c8-1ff241e2790d	87932847387453	2025-03-12 04:28:47.146115+00	2025-03-12 04:28:47.146115+00	558c1002-65b9-40c5-8816-4a1e9a382f3a	2025-03-12 04:28:47.146115+00
1b92da93-5b14-43d1-b5c8-2edc44f6b705	698574839847	2025-03-12 04:34:38.060739+00	2025-03-12 04:34:38.060739+00	048b3560-f6a6-410e-886c-25d204bd89a2	2025-03-12 04:34:38.060739+00
6fbd0341-de43-489e-859e-8738339484e0	56789765	2025-03-12 04:46:42.013592+00	2025-03-12 04:46:42.013592+00	4b674912-712f-4ed5-9fff-cf224b84903a	2025-03-12 04:46:42.013592+00
826bef51-5a1b-4c64-a8e5-391109029d56	678976789876789	2025-03-12 04:52:13.987001+00	2025-03-12 04:52:13.987001+00	ad7881c6-033b-41f3-8cc2-52222ca01404	2025-03-12 04:52:13.987001+00
\.


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.migrations_id_seq', 58, true);


--
-- Name: user_category_preferences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_category_preferences_id_seq', 40, true);


--
-- Name: user_tag_preferences_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.user_tag_preferences_id_seq', 9, true);


--
-- Name: admins admins_login_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_login_key UNIQUE (login);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: event_tags event_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_tags
    ADD CONSTRAINT event_tags_pkey PRIMARY KEY (event_id, tag_id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: subcategories subcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_pkey PRIMARY KEY (id);


--
-- Name: swipes swipes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.swipes
    ADD CONSTRAINT swipes_pkey PRIMARY KEY (id);


--
-- Name: tag_subcategories tag_subcategories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tag_subcategories
    ADD CONSTRAINT tag_subcategories_pkey PRIMARY KEY (tag_id, subcategory_id);


--
-- Name: tags_categories tags_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags_categories
    ADD CONSTRAINT tags_categories_pkey PRIMARY KEY (tag_id, category_id);


--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);


--
-- Name: user_category_preferences user_category_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_category_preferences
    ADD CONSTRAINT user_category_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_category_preferences user_category_preferences_user_id_subcategory_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_category_preferences
    ADD CONSTRAINT user_category_preferences_user_id_subcategory_id_key UNIQUE (user_id, subcategory_id);


--
-- Name: user_tag_preferences user_tag_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tag_preferences
    ADD CONSTRAINT user_tag_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_tag_preferences user_tag_preferences_user_id_tag_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tag_preferences
    ADD CONSTRAINT user_tag_preferences_user_id_tag_id_key UNIQUE (user_id, tag_id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_telegram_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_telegram_id_key UNIQUE (telegram_id);


--
-- Name: users users_temp_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_temp_id_key UNIQUE (temp_id);


--
-- Name: idx_categories_parent_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_categories_parent_id ON public.categories USING btree (parent_id);


--
-- Name: idx_event_tags_values; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_event_tags_values ON public.event_tags USING gin (selected_values);


--
-- Name: idx_events_subcategories; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_events_subcategories ON public.events USING gin (subcategories);


--
-- Name: idx_sessions_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_expires_at ON public.sessions USING btree (expires_at);


--
-- Name: idx_subcategories_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_subcategories_category_id ON public.subcategories USING btree (category_id);


--
-- Name: idx_swipes_direction; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_swipes_direction ON public.swipes USING btree (direction);


--
-- Name: idx_swipes_event_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_swipes_event_id ON public.swipes USING btree (event_id);


--
-- Name: idx_swipes_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_swipes_user_id ON public.swipes USING btree (user_id);


--
-- Name: idx_tag_subcategories_subcategory_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tag_subcategories_subcategory_id ON public.tag_subcategories USING btree (subcategory_id);


--
-- Name: idx_tags_categories_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tags_categories_category_id ON public.tags_categories USING btree (category_id);


--
-- Name: idx_tags_categories_tag_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tags_categories_tag_id ON public.tags_categories USING btree (tag_id);


--
-- Name: idx_tags_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tags_is_active ON public.tags USING btree (is_active);


--
-- Name: idx_tags_possible_values; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tags_possible_values ON public.tags USING gin (possible_values);


--
-- Name: idx_tags_subcategories; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tags_subcategories ON public.tags USING gin (subcategories);


--
-- Name: idx_user_tag_preferences_tag_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_tag_preferences_tag_id ON public.user_tag_preferences USING btree (tag_id);


--
-- Name: idx_user_tag_preferences_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_tag_preferences_user_id ON public.user_tag_preferences USING btree (user_id);


--
-- Name: idx_users_telegram_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_telegram_id ON public.users USING btree (telegram_id);


--
-- Name: sessions cleanup_expired_sessions_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER cleanup_expired_sessions_trigger AFTER INSERT OR UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.cleanup_expired_sessions();


--
-- Name: user_category_preferences ensure_subcategory_reference; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER ensure_subcategory_reference BEFORE INSERT OR UPDATE ON public.user_category_preferences FOR EACH ROW EXECUTE FUNCTION public.validate_subcategory_reference();


--
-- Name: admins update_admins_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON public.admins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: categories update_categories_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: event_tags update_event_tags_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_event_tags_updated_at BEFORE UPDATE ON public.event_tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: events update_events_updated_at_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_events_updated_at_trigger BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.update_events_updated_at();


--
-- Name: subcategories update_subcategories_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_subcategories_updated_at BEFORE UPDATE ON public.subcategories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: swipes update_swipes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_swipes_updated_at BEFORE UPDATE ON public.swipes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tag_subcategories update_tag_subcategories_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_tag_subcategories_updated_at BEFORE UPDATE ON public.tag_subcategories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tags_categories update_tags_categories_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_tags_categories_updated_at BEFORE UPDATE ON public.tags_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tags update_tags_timestamp; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_tags_timestamp BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


--
-- Name: tags update_tags_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_category_preferences update_user_category_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_category_preferences_updated_at BEFORE UPDATE ON public.user_category_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_tag_preferences update_user_tag_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_tag_preferences_updated_at BEFORE UPDATE ON public.user_tag_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_last_active; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_last_active BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_last_active_at();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: events validate_event_subcategories_trigger; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER validate_event_subcategories_trigger BEFORE INSERT OR UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.validate_event_subcategories();


--
-- Name: event_tags validate_event_tag_values; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER validate_event_tag_values BEFORE INSERT OR UPDATE ON public.event_tags FOR EACH ROW EXECUTE FUNCTION public.validate_event_tag_values();


--
-- Name: categories categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id);


--
-- Name: event_tags event_tags_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_tags
    ADD CONSTRAINT event_tags_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: event_tags event_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.event_tags
    ADD CONSTRAINT event_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: subcategories subcategories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subcategories
    ADD CONSTRAINT subcategories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: swipes swipes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.swipes
    ADD CONSTRAINT swipes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tag_subcategories tag_subcategories_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tag_subcategories
    ADD CONSTRAINT tag_subcategories_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.subcategories(id) ON DELETE CASCADE;


--
-- Name: tag_subcategories tag_subcategories_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tag_subcategories
    ADD CONSTRAINT tag_subcategories_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: tags_categories tags_categories_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags_categories
    ADD CONSTRAINT tags_categories_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: tags_categories tags_categories_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tags_categories
    ADD CONSTRAINT tags_categories_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: user_category_preferences user_category_preferences_subcategory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_category_preferences
    ADD CONSTRAINT user_category_preferences_subcategory_id_fkey FOREIGN KEY (subcategory_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: user_category_preferences user_category_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_category_preferences
    ADD CONSTRAINT user_category_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_tag_preferences user_tag_preferences_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tag_preferences
    ADD CONSTRAINT user_tag_preferences_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;


--
-- Name: user_tag_preferences user_tag_preferences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_tag_preferences
    ADD CONSTRAINT user_tag_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

